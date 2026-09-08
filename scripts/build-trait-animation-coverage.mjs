import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createChiknTraitAnimationProfiles, loadChiknRig, loadRoostrRig, validateChiknTraitAnimationProfiles } from '@roost2d/chikn-rigs';

const manifest = JSON.parse(await readFile(resolve('runtime/manifest.json'), 'utf8'));
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
    rows.push({ ...profile, assetIds, alternateAssetIds });
  }
}

const traitAssets = manifest.files.filter(({ id }) => /^(?:chikn|roostr)-traits\//.test(id) && !/\/base\//i.test(id));
const unexplained = traitAssets.map(({ id }) => id).filter((id) => !claimed.has(id));
if (unexplained.length) throw new Error(`Trait assets without an animation profile or declared alternate:\n${unexplained.join('\n')}`);
const unknownAlternates = Object.entries(alternateConfig.alternates).filter(([assetId, groupId]) => !claimed.has(assetId) || !rows.some((row) => row.traitGroupId === groupId));
if (unknownAlternates.length) throw new Error(`Invalid trait alternate mappings: ${unknownAlternates.map(([assetId]) => assetId).join(', ')}`);

const report = {
  schema: 'chikn-game-assets.trait-animation-coverage/v1',
  assetManifestVersion: manifest.version,
  totals: { traitGroups: rows.length, chikn: rows.filter(({ species }) => species === 'chikn').length, roostr: rows.filter(({ species }) => species === 'roostr').length, traitAssets: traitAssets.length, specials: rows.filter(({ special }) => special).length },
  traits: rows.sort((a, b) => `${a.species}/${a.traitGroupId}`.localeCompare(`${b.species}/${b.traitGroupId}`)),
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
const output = resolve('reports/trait-animation-coverage.json');
if (process.argv.includes('--check')) {
  const expected = await readFile(output, 'utf8').catch(() => undefined);
  if (expected !== serialized) throw new Error('Trait animation coverage report is stale; run npm run animations:coverage and review it.');
  console.log(`Verified animation coverage for ${rows.length} trait groups and ${traitAssets.length} trait assets.`);
} else {
  await writeFile(output, serialized);
  console.log(`Wrote animation coverage for ${rows.length} trait groups and ${traitAssets.length} trait assets.`);
}
