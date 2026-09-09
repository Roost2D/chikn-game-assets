import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createChiknTraitAnimationProfiles, loadChiknRig, loadRoostrRig, validateChiknTraitAnimationProfiles } from '@roost2d/chikn-rigs';

const manifest = JSON.parse(await readFile(resolve('runtime/manifest.json'), 'utf8'));
const lineage = JSON.parse(await readFile(resolve('reports/source-runtime-lineage.json'), 'utf8'));
const lineageByAssetId = new Map(lineage.assets.map((asset) => [asset.assetId, asset]));
const alternateConfig = JSON.parse(await readFile(resolve('config/trait-animation-alternates.json'), 'utf8'));
if (alternateConfig.schema !== 'chikn-game-assets.trait-animation-alternates/v1') throw new Error('Invalid trait animation alternate schema');
const fileFetch = async (url) => new Response(await readFile(url), { status: 200, headers: { 'content-type': 'application/json' } });
const logicalIds = new Map(manifest.files.flatMap((file) => [file.id, ...(file.aliases ?? [])].map((id) => [id, file.id])));
const rows = [];
const claimed = new Map();

for (const [species, load] of [['chikn', loadChiknRig], ['roostr', loadRoostrRig]]) {
  const definition = await load(fileFetch);
  const profiles = createChiknTraitAnimationProfiles(definition);
  const errors = validateChiknTraitAnimationProfiles(definition, profiles);
  if (errors.length) throw new Error(errors.join('\n'));
  for (const profile of profiles) {
    const group = definition.attachmentGroups[profile.traitGroupId];
    const assetIds = [...new Set(group.attachmentIds.map((attachmentId) => {
      const attachment = definition.attachments.find(({ id }) => id === attachmentId);
      return attachment && logicalIds.get(attachment.texture.assetId);
    }).filter(Boolean))];
    if (!assetIds.length) throw new Error(`${species}:${profile.traitGroupId} has no manifest-resolved trait artwork`);
    for (const assetId of assetIds) claimed.set(assetId, profile.traitGroupId);
    const alternateAssetIds = Object.entries(alternateConfig.alternates)
      .filter(([, groupId]) => groupId === profile.traitGroupId)
      .map(([assetId]) => assetId)
      .filter((assetId) => assetId.startsWith(`${species}-traits/`));
    for (const assetId of alternateAssetIds) {
      if (!manifest.files.some(({ id }) => id === assetId)) throw new Error(`Configured trait alternate is missing: ${assetId}`);
      claimed.set(assetId, profile.traitGroupId);
    }
    const exactProjectile = profile.special && ['egg', 'disk', 'pan'].includes(profile.special.preset)
      ? { attachmentId: profile.attachmentTargets[0], assetId: assetIds[0] }
      : undefined;
    rows.push({
      ...profile,
      assetIds,
      alternateAssetIds,
      actionOrigin: profile.special?.origin,
      projectileSource: exactProjectile,
      targetDirection: { coordinateSpace: 'fighter-local', forwardAxis: '+x', defaultTargetOffset: { x: 180, y: 0 } },
      sourcePaths: [...new Set(assetIds.flatMap((assetId) => lineageByAssetId.get(assetId)?.sourcePaths ?? []))],
    });
  }
}

const traitAssets = manifest.files.filter(({ id }) => /^(?:chikn|roostr)-traits\//.test(id) && !/\/base\//i.test(id));
const unexplained = traitAssets.map(({ id }) => id).filter((id) => !claimed.has(id));
if (unexplained.length) throw new Error(`Trait assets without an animation profile or declared alternate:\n${unexplained.join('\n')}`);
const unknownAlternates = Object.entries(alternateConfig.alternates).filter(([assetId, groupId]) => !claimed.has(assetId) || !rows.some((row) => row.traitGroupId === groupId));
if (unknownAlternates.length) throw new Error(`Invalid trait alternate mappings: ${unknownAlternates.map(([assetId]) => assetId).join(', ')}`);

const report = {
  schema: 'chikn-game-assets.trait-animation-coverage/v2',
  assetManifestVersion: manifest.version,
  totals: { traitGroups: rows.length, chikn: rows.filter(({ species }) => species === 'chikn').length, roostr: rows.filter(({ species }) => species === 'roostr').length, traitAssets: traitAssets.length, specials: rows.filter(({ special }) => special).length },
  traits: rows.sort((a, b) => `${a.species}/${a.traitGroupId}`.localeCompare(`${b.species}/${b.traitGroupId}`)),
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
const output = resolve('reports/trait-animation-coverage.json');
const contactSheets = new Map(['chikn', 'roostr'].map((species) => [species, contactSheet(species, report.traits.filter((row) => row.species === species))]));
if (process.argv.includes('--check')) {
  const expected = await readFile(output, 'utf8').catch(() => undefined);
  if (expected !== serialized) throw new Error('Trait animation coverage report is stale; run npm run animations:coverage and review it.');
  for (const [species, html] of contactSheets) {
    const current = await readFile(resolve(`reports/trait-animation-contact-sheet-${species}.html`), 'utf8').catch(() => undefined);
    if (current !== html) throw new Error(`${species} trait animation contact sheet is stale; run npm run animations:coverage and review it.`);
  }
  console.log(`Verified animation coverage for ${rows.length} trait groups and ${traitAssets.length} trait assets.`);
} else {
  await writeFile(output, serialized);
  for (const [species, html] of contactSheets) await writeFile(resolve(`reports/trait-animation-contact-sheet-${species}.html`), html);
  console.log(`Wrote animation coverage for ${rows.length} trait groups and ${traitAssets.length} trait assets.`);
}

function contactSheet(species, traits) {
  const cards = traits.map((trait) => {
    const source = trait.sourcePaths[0];
    const image = source ? `<img src="../${encodeURI(source)}" alt="">` : '<span class="missing">No source preview</span>';
    const preset = trait.special?.preset ?? trait.punchPreset ?? trait.kickPreset ?? trait.secondaryMotion;
    const origin = trait.actionOrigin ? `${trait.actionOrigin.target}:${trait.actionOrigin.targetId}` : 'none';
    return `<article data-preset="${escapeHtml(preset)}"><h2>${escapeHtml(trait.traitGroupId)}</h2><p>${escapeHtml(trait.motionFamily)} · ${escapeHtml(preset)} · origin ${escapeHtml(origin)} · target +X</p><div class="phases"><figure class="anticipation">${image}<figcaption>anticipation</figcaption></figure><figure class="release">${image}<figcaption>release/contact</figcaption></figure><figure class="recovery">${image}<figcaption>recovery</figcaption></figure></div></article>`;
  }).join('\n');
  return `<!doctype html>\n<meta charset="utf-8">\n<title>${species} trait animation contact sheet</title>\n<style>\n*{box-sizing:border-box}body{margin:0;padding:24px;background:#17140f;color:#f7f0e2;font:12px system-ui}header{position:sticky;top:0;z-index:2;background:#17140fee;padding:8px 0 16px}h1{margin:0;font-size:26px}header p,article p{margin:5px 0;color:#bdb19c}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px}article{break-inside:avoid;background:#211d16;border:1px solid #413827;border-radius:10px;padding:10px}h2{font-size:14px;margin:0}.phases{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}figure{margin:0;height:112px;display:grid;place-items:center;background:repeating-conic-gradient(#302b22 0 25%,#26221b 0 50%) 0/16px 16px;overflow:hidden;position:relative}img{width:82px;height:82px;object-fit:contain;filter:drop-shadow(0 2px 2px #0008)}.anticipation img{transform:translate(-5px,3px) rotate(-8deg) scale(.94)}.release img{transform:translate(8px,-5px) rotate(16deg) scale(1.08)}.recovery img{transform:translate(2px,1px) rotate(-4deg) scale(.99)}article[data-preset=egg] .release img,article[data-preset=disk] .release img,article[data-preset=pan] .release img{transform:translate(20px,-13px) rotate(38deg) scale(1.02)}article[data-preset=heavy] .release img,article[data-preset=heavy-swing] .release img{transform:translate(7px,1px) rotate(24deg) scale(1.12)}figcaption{position:absolute;bottom:2px;left:4px;background:#17140fdd;padding:2px 4px;border-radius:3px}.missing{color:#d98}</style>\n<header><h1>${species === 'chikn' ? 'Chikn' : 'Roostr'} trait animation contact sheet</h1><p>${traits.length} curated groups · exact source art · anticipation, release/contact, recovery · local target +X</p></header>\n<main class="grid">${cards}</main>\n`;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
