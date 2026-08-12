import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { canonicalSourceBytes, sourceSha256 } from './source-hash.mjs';

const root = resolve('.');
const packageVersion = JSON.parse(await readFile(resolve('package.json'), 'utf8')).version;
const sourceSelection = JSON.parse(await readFile(resolve('config/source-selection.json'), 'utf8'));
const assetAliasConfig = JSON.parse(await readFile(resolve('config/asset-aliases.json'), 'utf8'));
const configuredAliases = assetAliasConfig.aliases ?? {};
const budgets = JSON.parse(await readFile(resolve('config/budgets.json'), 'utf8'));
const rightsManifestBytes = await readFile(resolve('manifests/rights-manifest.json'));
const rightsManifest = JSON.parse(rightsManifestBytes.toString('utf8'));
const rightsByPath = new Map(rightsManifest.assets.map((asset) => [asset.sourcePath, asset]));
const excludedPaths = new Set(rightsManifest.excludedPaths ?? []);
const inventoryOnly = process.argv.includes('--inventory-only');
const dryRun = process.argv.includes('--dry-run');
const incremental = process.argv.includes('--incremental');
const profiles = [
  { id: 'default', maxAtlasSize: 2048, scale: 0.5, gpuBudgetBytes: 64 * 1024 * 1024, padding: 2, extrude: 1 },
  { id: 'high', maxAtlasSize: 4096, scale: 1, gpuBudgetBytes: 256 * 1024 * 1024, padding: 2, extrude: 1 }
];

const allSourceFiles = [];
const imageEntries = [];
const directEntries = [];
const sourceAtlases = [];
for (const selection of sourceSelection.roots) {
  const sourceRoot = resolve(selection.source);
  for (const absolute of await walk(sourceRoot)) {
    const sourcePath = relative(root, absolute).split(sep).join('/');
    if (excludedPaths.has(sourcePath)) continue;
    const bytes = await readFile(absolute); const canonicalBytes = canonicalSourceBytes(bytes, sourcePath); const sha256 = sourceSha256(bytes, sourcePath);
    allSourceFiles.push({ path: sourcePath, bytes: canonicalBytes.byteLength, sha256 });
    const rights = rightsByPath.get(sourcePath);
    if (!rights) throw new Error(`Source is not classified in the rights manifest: ${sourcePath}`);
    const authorized = rights.license === 'Apache-2.0' ? rights.approved === true : rights.hostingAuthorized === true && rights.communityUseAuthorized === true && rights.sublicenseGrantedByRepository === false;
    if (!authorized || rights.sha256 !== sha256) throw new Error(`Source is unauthorized or changed: ${sourcePath}`);
    const directMediaType = selection.runtimeFiles?.mediaTypes?.[extname(sourcePath).toLowerCase()];
    if (selection.runtime !== false && directMediaType) directEntries.push(describeDirectFile(absolute, sourceRoot, selection, rights, bytes, directMediaType));
    const isConfiguredSourceAtlas = selection.sourceAtlas && sourcePath === `${selection.source}/${selection.sourceAtlas.json}`;
    if (selection.runtime !== false && /\.json$/i.test(absolute) && (isConfiguredSourceAtlas || /_atlas_high\.json$/i.test(absolute))) sourceAtlases.push({ absolute, sourceRoot, selection, sourcePath });
    if (selection.runtime !== false && !selection.sourceAtlas && /\.(?:png|jpe?g)$/i.test(absolute) && !/_atlas_(?:high|low)\.(?:png|jpe?g)$/i.test(absolute)) imageEntries.push(await describeImage(absolute, sourceRoot, selection, [rights.id]));
  }
}
allSourceFiles.sort((a, b) => a.path.localeCompare(b.path));

const claimedReferences = new Set([...imageEntries, ...directEntries].flatMap(({ assetId, aliases }) => [assetId, ...aliases]));
for (const sourceAtlas of sourceAtlases.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))) {
  const atlas = JSON.parse(await readFile(sourceAtlas.absolute, 'utf8')); const imageName = atlas.meta?.image ?? sourceAtlas.sourcePath.replace(/\.json$/i, '.png').split('/').at(-1); const imagePath = resolve(dirname(sourceAtlas.absolute), imageName);
  const atlasSourcePath = relative(root, imagePath).split(sep).join('/'); const atlasRights = rightsByPath.get(atlasSourcePath); const jsonRights = rightsByPath.get(sourceAtlas.sourcePath);
  if (!atlasRights || !jsonRights) throw new Error(`Prebuilt atlas is missing rights lineage: ${sourceAtlas.sourcePath}`);
  const atlasImage = sharp(imagePath);
  for (const [frameName, definition] of Object.entries(atlas.frames ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const framePrefix = sourceAtlas.selection.sourceAtlas?.framePrefix ?? '';
    const normalizedFrameName = frameName.replaceAll('\\', '/');
    if (framePrefix && !normalizedFrameName.startsWith(framePrefix)) throw new Error(`${sourceAtlas.sourcePath}: frame ${frameName} does not start with ${framePrefix}`);
    const strippedFrameName = normalizedFrameName.slice(framePrefix.length);
    const relativeDirectory = relative(sourceAtlas.sourceRoot, dirname(sourceAtlas.absolute)).split(sep).filter((part) => part && part !== '.');
    const unique = sourceAtlas.selection.sourceAtlas?.unique === true ? uniqueFrame(sourceAtlas.selection.species, strippedFrameName) : undefined;
    const idPrefix = sourceAtlas.selection.sourceAtlas?.compatibilityIdPrefix;
    const assetId = unique ? `assembled-unique/${unique.species}/${assetToken(unique.skinName)}/${assetToken(unique.slotId)}` : idPrefix ? `${idPrefix}/${assetToken(strippedFrameName)}` : [sourceAtlas.selection.group, ...relativeDirectory.map(slug), assetToken(strippedFrameName)].join('/');
    if (claimedReferences.has(assetId)) continue;
    const aliases = uniqueAliases([
      ...(sourceAtlas.selection.rigAliases || unique ? [`${sourceAtlas.selection.species}.rig.${assetToken(strippedFrameName)}`] : []),
      ...(unique ? [`unique.${unique.species}.${unique.token}.${assetToken(unique.slotId)}`] : []),
      ...(sourceSelection.additionalAliases?.[assetId] ?? []),
      ...(configuredAliases[assetId] ?? []),
    ]);
    const { buffer, width, height } = await extractAtlasFrame(atlasImage, definition, sourceAtlas.sourcePath, frameName);
    imageEntries.push({ assetId, aliases, group: sourceAtlas.selection.group, species: sourceAtlas.selection.species, unique: Boolean(unique), sourcePaths: [sourceAtlas.sourcePath, atlasSourcePath], rightsIds: [jsonRights.id, atlasRights.id], width, height, buffer });
    for (const reference of [assetId, ...aliases]) {
      if (claimedReferences.has(reference)) throw new Error(`Duplicate asset reference: ${reference}`);
      claimedReferences.add(reference);
    }
  }
}

imageEntries.sort((a, b) => a.assetId.localeCompare(b.assetId));
directEntries.sort((a, b) => a.assetId.localeCompare(b.assetId));
const runtimeEntries = [...imageEntries, ...directEntries].sort((a, b) => a.assetId.localeCompare(b.assetId));
for (const assetId of Object.keys(configuredAliases)) if (!runtimeEntries.some((entry) => entry.assetId === assetId)) throw new Error(`Configured aliases reference unknown canonical asset: ${assetId}`);
assertUnique(runtimeEntries.map((entry) => entry.assetId), 'asset id'); assertUnique(runtimeEntries.flatMap((entry) => entry.aliases), 'asset alias');
const primaryIds = new Set(runtimeEntries.map((entry) => entry.assetId));
for (const alias of runtimeEntries.flatMap((entry) => entry.aliases)) if (primaryIds.has(alias)) throw new Error(`Asset alias collides with a primary id: ${alias}`);
const fingerprint = sha256Hex(Buffer.from(JSON.stringify({ sources: allSourceFiles.map(({ path, sha256 }) => [path, sha256]), selection: sourceSelection, aliases: assetAliasConfig, rightsDocumentSha256: sha256Hex(rightsManifestBytes), profiles, version: packageVersion })));
if (incremental) try { if ((await readFile(resolve('runtime/.build-fingerprint'), 'utf8')).trim() === fingerprint) { console.log('Asset runtime is current; incremental build skipped.'); process.exit(0); } } catch {}

await mkdir(resolve('reports/reproducibility'), { recursive: true });
await writeJson('reports/approved-inventory.json', { schema: 'chikn-game-assets.approved-inventory/v1', generatedAt: generatedAt(), selection: sourceSelection, aliases: assetAliasConfig, rightsManifest: 'manifests/rights-manifest.json', totals: { files: allSourceFiles.length, images: imageEntries.length, directFiles: directEntries.length, bytes: allSourceFiles.reduce((total, file) => total + file.bytes, 0) }, files: allSourceFiles, images: imageEntries.map(({ buffer, ...image }) => image), directFiles: directEntries.map(({ buffer, ...entry }) => entry) });
if (inventoryOnly || dryRun) { console.log(`${dryRun ? 'Dry run:' : 'Inventory:'} ${imageEntries.length} logical images and ${directEntries.length} direct files from ${allSourceFiles.length} approved source files.`); process.exit(0); }

await rm(resolve('runtime'), { recursive: true, force: true }); await mkdir(resolve('runtime/atlases'), { recursive: true });
const profileDefinitions = Object.fromEntries(profiles.map((profile) => [profile.id, { maxAtlasSize: profile.maxAtlasSize, scale: profile.scale, gpuBudgetBytes: profile.gpuBudgetBytes }]));
const builtVariants = new Map(runtimeEntries.map((entry) => [entry.assetId, []])); const pageMetadata = [];

for (const profile of profiles) for (const [group, entries] of Object.entries(groupBy(imageEntries, (entry) => entry.group))) {
  const pages = pack(entries, profile);
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]; const pageName = `${slug(group)}-${String(index + 1).padStart(3, '0')}`; const directory = resolve(`runtime/atlases/${profile.id}`); await mkdir(directory, { recursive: true });
    const png = await renderPage(page, profile); const pngPath = resolve(directory, `${pageName}.png`); const jsonPath = resolve(directory, `${pageName}.json`); await writeFile(pngPath, png);
    const relativePng = relative(root, pngPath).split(sep).join('/'); const integrity = sri(png); const frames = {};
    for (const item of page.items) {
      frames[item.entry.assetId] = { x: item.x, y: item.y, width: item.width, height: item.height, sourceWidth: item.entry.width, sourceHeight: item.entry.height };
      builtVariants.get(item.entry.assetId).push({ profile: profile.id, path: relativePng, bytes: png.byteLength, integrity: { algorithm: 'sha256', value: integrity }, width: page.width, height: page.height, scale: profile.scale, frameId: item.entry.assetId, frame: frames[item.entry.assetId] });
    }
    await writeJson(jsonPath, { schema: 'roost2d.atlas/v1', profile: profile.id, image: `${pageName}.png`, integrity: { algorithm: 'sha256', value: integrity }, width: page.width, height: page.height, frames });
    pageMetadata.push({ profile: profile.id, group, path: relativePng, bytes: png.byteLength, integrity, width: page.width, height: page.height, frames });
  }
}

for (const entry of directEntries) {
  const output = resolve(entry.runtimePath);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, entry.buffer);
  const variant = { path: entry.runtimePath, bytes: entry.buffer.byteLength, integrity: { algorithm: 'sha256', value: sri(entry.buffer) }, scale: 1 };
  builtVariants.set(entry.assetId, profiles.map(({ id: profile }) => ({ profile, ...variant })));
}

for (const page of pageMetadata) assertBudget(`atlas ${page.path}`, page.bytes, page.profile === 'default' ? budgets.atlasDefaultBytes : budgets.atlasHighBytes);
const bundleFor = (bundleId, entries) => {
  const pagePaths = new Set(entries.flatMap((entry) => builtVariants.get(entry.assetId)).map((variant) => variant.path));
  const gpuBytes = pageMetadata.filter((page) => page.profile === 'default' && pagePaths.has(page.path)).reduce((total, page) => total + page.width * page.height * 4, 0);
  return { id: bundleId, items: entries.map((entry) => ({ assetId: entry.assetId, required: true })), lazy: true, preload: false, estimatedGpuBytes: gpuBytes };
};
const bundles = [
  ...[...new Set(runtimeEntries.flatMap((entry) => [entry.assetId, ...entry.aliases]).filter((reference) => reference.includes('/')).map((reference) => reference.split('/')[0]))].sort().map((bundleId) => bundleFor(bundleId, runtimeEntries.filter((entry) => entry.assetId.startsWith(`${bundleId}/`) || entry.aliases.some((alias) => alias.startsWith(`${bundleId}/`))))),
  ...['chikn', 'roostr'].map((species) => bundleFor(`${species}-unique`, imageEntries.filter((entry) => entry.unique && entry.species === species))).filter((bundle) => bundle.items.length),
];
const manifest = {
  schema: 'roost2d.assets/v1', version: packageVersion, generatedAt: generatedAt(), rightsDocumentSha256: sha256Hex(rightsManifestBytes), profiles: profileDefinitions,
  files: runtimeEntries.map((entry) => ({ id: entry.assetId, kind: entry.kind ?? 'atlas-frame', mediaType: entry.mediaType ?? 'image/png', variants: builtVariants.get(entry.assetId), aliases: entry.aliases, ...contentRights(entry.rightsIds), rightsIds: entry.rightsIds })),
  bundles,
};
await writeJson('runtime/manifest.json', manifest); await writeFile(resolve('runtime/.build-fingerprint'), `${fingerprint}\n`);
const runtimeBytes = await totalBytes(resolve('runtime')); assertBudget('default runtime', await totalBytes(resolve('runtime/atlases/default')), budgets.runtimeDefaultBytes); assertBudget('high runtime', await totalBytes(resolve('runtime/atlases/high')), budgets.runtimeHighBytes);
await writeJson('reports/release-size.json', { schema: 'chikn-game-assets.release-size/v1', generatedAt: generatedAt(), runtimeBytes, sourceBytes: allSourceFiles.reduce((total, file) => total + file.bytes, 0), atlases: pageMetadata.map(({ frames, ...page }) => ({ ...page, frameCount: Object.keys(frames).length })), directFiles: directEntries.map((entry) => ({ assetId: entry.assetId, path: entry.runtimePath, mediaType: entry.mediaType, bytes: entry.buffer.byteLength })) });
await writeJson('reports/source-runtime-lineage.json', { schema: 'chikn-game-assets.lineage/v1', generatedAt: generatedAt(), assets: runtimeEntries.map((entry) => ({ assetId: entry.assetId, sourcePaths: entry.sourcePaths, rightsIds: entry.rightsIds, variants: builtVariants.get(entry.assetId).map(({ profile, path, frameId, frame }) => ({ profile, path, frameId, frame })) })) });
await writeJson('reports/reproducibility/semantic.json', await createSemanticReport(manifest, pageMetadata));

function generatedAt() { return new Date(Number(process.env.SOURCE_DATE_EPOCH ?? 0) * 1000).toISOString(); }
function sha256Hex(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function sri(bytes) { return `sha256-${createHash('sha256').update(bytes).digest('base64')}`; }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function assetToken(value) { return slug(value.replace(/\.[^.]+$/, '')); }
function uniqueFrame(species, frameName) {
  if (species !== 'chikn' && species !== 'roostr') throw new Error(`Unique atlas frame ${frameName} has no supported species`);
  const stem = frameName.replace(/\.[^.]+$/, ''); const separator = stem.lastIndexOf('_');
  if (separator <= 0) throw new Error(`Unique atlas frame ${frameName} must contain a skin and part`);
  const skinName = stem.slice(0, separator); const rawSlot = stem.slice(separator + 1); const token = Number.parseInt((skinName.match(/(\d+)$/) ?? [])[1], 10);
  if (!Number.isInteger(token)) throw new Error(`Unique atlas frame ${frameName} has no token id`);
  return { species, token, skinName, slotId: rawSlot.replace(/([a-z])([AB])$/, '$1 $2') };
}
function assertBudget(label, actual, maximum) { if (actual > maximum) throw new Error(`${label}: ${actual} bytes exceeds ${maximum} byte budget`); }
function assertUnique(values, label) { const seen = new Set(); for (const value of values) { if (!value || seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`); seen.add(value); } }
function contentRights(rightsIds) {
  const records = rightsIds.map((id) => rightsManifest.assets.find((asset) => asset.id === id)).filter(Boolean);
  const protectedRecord = records.find(({ license }) => license === 'CHIKN-COMMUNITY-NONCOMMERCIAL');
  if (!protectedRecord) {
    const projectRecord = records.find(({ license, approved }) => license === 'Apache-2.0' && approved === true);
    if (!projectRecord) throw new Error(`Runtime asset has no approved content rights record: ${rightsIds.join(', ')}`);
    return { license: projectRecord.license, commercialUse: projectRecord.commercialUse, attribution: projectRecord.attribution };
  }
  return {
    license: protectedRecord.license,
    ownership: protectedRecord.ownership,
    commercialUse: protectedRecord.commercialUse,
    attribution: protectedRecord.attribution,
    hostingAuthorized: protectedRecord.hostingAuthorized,
    communityUseAuthorized: protectedRecord.communityUseAuthorized,
    sublicenseGrantedByRepository: protectedRecord.sublicenseGrantedByRepository,
  };
}
function groupBy(values, key) { return values.reduce((groups, value) => { const id = key(value); (groups[id] ??= []).push(value); return groups; }, {}); }
async function writeJson(path, value) { const output = resolve(path); await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(value, null, 2)}\n`); }
async function walk(directory) { const result = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const absolute = resolve(directory, entry.name); if (entry.isDirectory()) result.push(...await walk(absolute)); else if (entry.isFile()) result.push(absolute); } return result; }
async function totalBytes(directory) { let total = 0; for (const file of await walk(directory)) total += (await stat(file)).size; return total; }

async function describeImage(absolute, sourceRoot, selection, rightsIds) {
  const metadata = await sharp(absolute).metadata(); if (!metadata.width || !metadata.height) throw new Error(`Unable to determine dimensions for ${absolute}`);
  const sourcePath = relative(sourceRoot, absolute).split(sep).join('/'); const sourceParts = sourcePath.replace(/\.(?:png|jpe?g)$/i, '').split('/').map(slug); const assetId = `${selection.group}/${sourceParts.join('/')}`; const base = assetToken(sourcePath.split('/').at(-1));
  const legacyRigId = selection.legacyRigIdPrefix && sourceParts[0] === 'base' ? `${selection.legacyRigIdPrefix}/${sourceParts.slice(1).join('/')}` : undefined;
  const aliases = uniqueAliases([
    ...(selection.rigAliases ? [`${selection.species}.rig.${base}`] : []),
    ...(selection.compatibilityIdPrefix ? [`${selection.compatibilityIdPrefix}/${base}`] : []),
    ...(legacyRigId ? [legacyRigId] : []),
    ...(sourceSelection.additionalAliases?.[assetId] ?? []),
    ...(configuredAliases[assetId] ?? []),
  ]);
  return { assetId, aliases, group: packingGroup(selection.group, rightsIds), sourcePaths: [relative(root, absolute).split(sep).join('/')], rightsIds, width: metadata.width, height: metadata.height, buffer: await readFile(absolute) };
}

function describeDirectFile(absolute, sourceRoot, selection, rights, buffer, mediaType) {
  const sourceRelativePath = relative(sourceRoot, absolute).split(sep).join('/');
  const extension = extname(sourceRelativePath).toLowerCase();
  const parts = sourceRelativePath.slice(0, -extension.length).split('/').map(slug);
  const assetId = [selection.group, ...parts].join('/');
  const outputRoot = selection.runtimeFiles.output ?? `runtime/${slug(selection.group)}`;
  const runtimePath = [outputRoot.replace(/\/$/, ''), ...parts.slice(0, -1), `${parts.at(-1)}${extension}`].join('/');
  return {
    assetId,
    aliases: uniqueAliases([...(sourceSelection.additionalAliases?.[assetId] ?? []), ...(configuredAliases[assetId] ?? [])]),
    group: selection.group,
    sourcePaths: [relative(root, absolute).split(sep).join('/')],
    rightsIds: [rights.id],
    kind: selection.runtimeFiles.kind ?? 'file',
    mediaType,
    runtimePath,
    buffer,
  };
}

function uniqueAliases(values) { return [...new Set(values.filter(Boolean))]; }

function packingGroup(group, rightsIds) {
  const records = rightsIds.map((id) => rightsManifest.assets.find((asset) => asset.id === id)).filter(Boolean);
  return records.some(({ license }) => license === 'CHIKN-COMMUNITY-NONCOMMERCIAL') ? group : `${group}-apache`;
}

async function extractAtlasFrame(atlasImage, definition, atlasPath, frameName) {
  if (definition.rotated) throw new Error(`${atlasPath}: rotated frame ${frameName} is unsupported`);
  const frame = definition.frame; const frameWidth = frame.w ?? frame.width; const frameHeight = frame.h ?? frame.height;
  const sourceSize = definition.sourceSize ?? { w: frameWidth, h: frameHeight }; const width = sourceSize.w ?? sourceSize.width; const height = sourceSize.h ?? sourceSize.height;
  const extracted = await atlasImage.clone().extract({ left: frame.x, top: frame.y, width: frameWidth, height: frameHeight }).png().toBuffer();
  if (!definition.trimmed) return { buffer: extracted, width, height };
  const placement = definition.spriteSourceSize ?? { x: 0, y: 0 };
  const buffer = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: extracted, left: placement.x, top: placement.y }]).png().toBuffer();
  return { buffer, width, height };
}

function pack(entries, profile) {
  const ordered = [...entries].sort((a, b) => (b.height - a.height) || (b.width - a.width) || a.assetId.localeCompare(b.assetId)); const pages = []; let page = createPage(profile);
  for (const entry of ordered) {
    const width = Math.max(1, Math.round(entry.width * profile.scale)); const height = Math.max(1, Math.round(entry.height * profile.scale)); const outerWidth = width + profile.padding * 2 + profile.extrude * 2; const outerHeight = height + profile.padding * 2 + profile.extrude * 2;
    if (outerWidth > profile.maxAtlasSize || outerHeight > profile.maxAtlasSize) throw new Error(`${entry.assetId} exceeds ${profile.id} atlas dimensions`);
    if (page.x + width + profile.padding + profile.extrude > profile.maxAtlasSize) { page.x = profile.padding + profile.extrude; page.y += page.rowHeight; page.rowHeight = 0; }
    if (page.y + height + profile.padding + profile.extrude > profile.maxAtlasSize) { if (!page.items.length) throw new Error(`Cannot pack ${entry.assetId}`); pages.push(finishPage(page)); page = createPage(profile); }
    page.items.push({ entry, x: page.x, y: page.y, width, height }); page.x += outerWidth; page.rowHeight = Math.max(page.rowHeight, outerHeight); page.usedWidth = Math.max(page.usedWidth, page.x); page.usedHeight = Math.max(page.usedHeight, page.y + height + profile.padding + profile.extrude);
  }
  if (page.items.length) pages.push(finishPage(page)); return pages;
}
function createPage(profile) { return { x: profile.padding + profile.extrude, y: profile.padding + profile.extrude, rowHeight: 0, usedWidth: 1, usedHeight: 1, items: [] }; }
function finishPage(page) { return { ...page, width: Math.max(1, page.usedWidth), height: Math.max(1, page.usedHeight) }; }
async function renderPage(page, profile) {
  const composites = await Promise.all(page.items.map(async (item) => ({ input: await sharp(item.entry.buffer).resize({ width: item.width, height: item.height, kernel: sharp.kernel.nearest }).extend({ top: profile.extrude, bottom: profile.extrude, left: profile.extrude, right: profile.extrude, extendWith: 'copy' }).png().toBuffer(), left: item.x - profile.extrude, top: item.y - profile.extrude })));
  return sharp({ create: { width: page.width, height: page.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composites).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function createSemanticReport(assetManifest, pages) { const semanticManifest = JSON.parse(JSON.stringify(assetManifest)); for (const file of semanticManifest.files) for (const variant of file.variants) { delete variant.bytes; delete variant.integrity; } const atlases = []; for (const page of pages) { const pixels = await sharp(resolve(page.path)).raw().toBuffer(); atlases.push({ profile: page.profile, path: page.path, pixelsSha256: sha256Hex(pixels), width: page.width, height: page.height, frames: page.frames }); } return { schema: 'chikn-game-assets.semantic-reproducibility/v1', generatedAt: generatedAt(), manifest: semanticManifest, atlases }; }
