import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { verifyManifestFiles } from './manifest-utils.mjs';

const root = resolve('.');
const manifest = JSON.parse(await readFile(resolve('runtime/manifest.json'), 'utf8'));
const errors = await verifyManifestFiles(manifest, root);
const rightsBytes = await readFile(resolve('manifests/rights-manifest.json'));
const rights = JSON.parse(rightsBytes.toString('utf8'));
const sourceSelection = JSON.parse(await readFile(resolve('config/source-selection.json'), 'utf8'));
const rightsIds = new Set(rights.assets.map(({ id }) => id));
const excludedPaths = new Set(rights.excludedPaths ?? []);
if (manifest.rightsDocumentSha256 !== sha256(rightsBytes)) errors.push('Runtime manifest rightsDocumentSha256 does not match the rights manifest');
for (const file of manifest.files) {
  if (!file.rightsIds?.length) errors.push(`${file.id}: missing source rights lineage`);
  for (const id of file.rightsIds ?? []) if (!rightsIds.has(id)) errors.push(`${file.id}: unknown rights id ${id}`);
  if (file.license !== 'CHIKN-COMMUNITY-NONCOMMERCIAL' || file.commercialUse !== 'separate-agreement-required') errors.push(`${file.id}: incomplete runtime community-terms metadata`);
  if (file.ownership !== 'third-party-chikn-rights-holder' || file.hostingAuthorized !== true || file.communityUseAuthorized !== true || file.sublicenseGrantedByRepository !== false) errors.push(`${file.id}: incomplete runtime ownership/community-use metadata`);
}
const lineage = JSON.parse(await readFile(resolve('reports/source-runtime-lineage.json'), 'utf8'));
if (lineage.assets.length !== manifest.files.length) errors.push('Source-to-runtime lineage does not cover every logical asset');
for (const entry of lineage.assets) {
  if (!manifest.files.some(({ id }) => id === entry.assetId)) errors.push(`Lineage references unknown asset ${entry.assetId}`);
  for (const sourcePath of entry.sourcePaths ?? []) if (excludedPaths.has(sourcePath)) errors.push(`${entry.assetId}: excluded project material reached runtime output`);
}
if (manifest.bundles.some(({ id }) => id === 'legacy-enemy-flat')) errors.push('Legacy project material must not be a published runtime bundle');
for (const selection of sourceSelection.roots.filter(({ group }) => /^(?:chikn|roostr)-(?:rig|traits)$/.test(group))) if (!selection.rigAliases) errors.push(`${selection.group}: rig-compatible sources must publish logical rig aliases`);
for (const [assetId, aliases] of Object.entries(sourceSelection.additionalAliases ?? {})) {
  const file = manifest.files.find(({ id }) => id === assetId);
  if (!file) errors.push(`Additional aliases reference unknown asset ${assetId}`);
  for (const alias of aliases) if (!file?.aliases?.includes(alias)) errors.push(`${assetId}: missing configured alias ${alias}`);
}
if (errors.length) throw new Error(errors.join('\n'));
const runtimeFiles = await walk(resolve('runtime'));
for (const file of runtimeFiles) {
  const head = (await readFile(file)).subarray(0, 64).toString('utf8');
  if (head.startsWith('version https://git-lfs.github.com/spec/v1')) throw new Error(`LFS pointer reached runtime output: ${file}`);
}
for (const prohibited of ['sources/farmland/tiles_atlas_low.png', 'sources/farmland/tiles_atlas_low.json', 'sources/farmland/overlays/overlays_atlas_low.png', 'sources/farmland/overlays/overlays_atlas_low.json']) {
  try { await stat(resolve(prohibited)); throw new Error(`Prohibited low FarmLand atlas remains: ${prohibited}`); } catch (error) { if (error instanceof Error && error.message.startsWith('Prohibited')) throw error; }
}
const overlaySources = (await readdir(resolve('sources/farmland/overlays'))).sort();
if (JSON.stringify(overlaySources) !== JSON.stringify(['overlays_atlas_high.json', 'overlays_atlas_high.png'])) throw new Error(`FarmLand overlays source directory must contain only overlays_atlas_high.json/png; found ${overlaySources.join(', ')}`);
const report = { schema: 'chikn-game-assets.exact-reproducibility/v1', platform: process.platform, node: process.version, files: [] };
for (const file of runtimeFiles.filter((entry) => entry.endsWith('.png')).sort()) {
  const bytes = await readFile(file);
  const raw = await sharp(file).raw().toBuffer();
  report.files.push({ path: file.slice(root.length + 1).replaceAll('\\', '/'), bytesSha256: sha256(bytes), pixelsSha256: sha256(raw) });
}
const compareIndex = process.argv.indexOf('--compare-dir');
if (compareIndex !== -1) {
  if (process.platform !== 'linux') throw new Error('Exact atlas-byte comparison is supported only in the Linux release container');
  const comparisonRoot = resolve(process.argv[compareIndex + 1] ?? '');
  const comparisonFiles = (await walk(comparisonRoot)).filter((entry) => entry.endsWith('.png')).sort();
  const comparison = [];
  for (const file of comparisonFiles) {
    const bytes = await readFile(file);
    const raw = await sharp(file).raw().toBuffer();
    comparison.push({ path: `runtime/${file.slice(comparisonRoot.length + 1).replaceAll('\\', '/')}`, bytesSha256: sha256(bytes), pixelsSha256: sha256(raw) });
  }
  if (JSON.stringify(comparison) !== JSON.stringify(report.files)) throw new Error('Linux exact atlas-byte reproducibility check failed');
}
if (process.argv.includes('--record-linux')) {
  if (process.platform !== 'linux') throw new Error('Exact atlas-byte baselines may only be recorded by the Linux release container');
  await writeFile(resolve('reports/reproducibility/linux-exact.json'), `${JSON.stringify(report, null, 2)}\n`);
}
if (process.argv.includes('--exact')) {
  if (process.platform !== 'linux') throw new Error('Exact atlas-byte verification is supported only in the Linux release container; use semantic/pixel verification elsewhere');
  const expected = JSON.parse(await readFile(resolve('reports/reproducibility/linux-exact.json'), 'utf8'));
  if (JSON.stringify(expected.files) !== JSON.stringify(report.files)) throw new Error('Linux exact atlas-byte reproducibility check failed');
}
console.log(`Verified ${manifest.files.length} assets and ${runtimeFiles.length} generated runtime files.`);

function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
async function walk(directory) { const result = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const full = resolve(directory, entry.name); if (entry.isDirectory()) result.push(...await walk(full)); else if (entry.isFile() && (await stat(full)).size >= 0) result.push(full); } return result; }
