import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const requiredAttribution = 'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm.';
const roost2dTag = process.env.ROOST2D_TAG ?? 'next';
const chiknTag = process.env.CHIKN_ASSETS_TAG ?? 'next';
const directory = await mkdtemp(join(tmpdir(), 'roost2d-cross-verify-'));
const npmArgs = (args) => process.platform === 'win32'
  ? [process.execPath, [resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), ...args]]
  : ['npm', args];

try {
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'roost2d-cross-verify', private: true, type: 'module' }));
  const [command, args] = npmArgs(['install', '--ignore-scripts', `@roost2d/contracts@${roost2dTag}`, `@roost2d/assets@${roost2dTag}`, `@roost2d/chikn-rigs@${roost2dTag}`, `@chikn-game-assets/runtime@${chiknTag}`]);
  await exec(command, args, { cwd: directory });
  await cp(resolve('runtime/manifest.json'), join(directory, 'runtime-manifest.json'));
  await writeFile(join(directory, 'verify.mjs'), `
    import { readFile } from 'node:fs/promises';
    import { fileURLToPath } from 'node:url';
    import { validateAssetManifest, validateRigDefinition } from '@roost2d/contracts';
    import { AssetManifestResolver } from '@roost2d/assets';
    import { loadChiknPack, resolveManifestUrl } from '@chikn-game-assets/runtime';
    import { CHIKN_RIG_ART_SCALE, loadChiknRig, loadRoostrRig, mergeUniqueSkin, UNIQUE_SKINS } from '@roost2d/chikn-rigs';
    const manifest = { schema: 'roost2d.assets/v1', version: '1', generatedAt: '1970-01-01T00:00:00.000Z', rightsDocumentSha256: 'a'.repeat(64), profiles: { default: { maxAtlasSize: 2048, scale: .5, gpuBudgetBytes: 64 } }, files: [{ id: 'example', mediaType: 'image/png', variants: [{ profile: 'default', path: 'runtime/example.png', bytes: 1, integrity: { algorithm: 'sha256', value: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' }, scale: .5 }] }], bundles: [] };
    if (validateAssetManifest(manifest).length) throw new Error('Published contracts rejected a valid manifest');
    new AssetManifestResolver(manifest, { baseUrl: 'https://assets.example/' });
    if (!resolveManifestUrl('https://assets.example/').pathname.endsWith('/runtime/manifest.json')) throw new Error('Runtime manifest resolver failed');
    const pack = await loadChiknPack({ manifestUrl: 'https://assets.example/runtime/manifest.json', fetch: async () => new Response(JSON.stringify(manifest)) });
    if (pack.findAsset('example')?.id !== 'example') throw new Error('Runtime pack adapter failed');
    const runtimeManifest = JSON.parse(await readFile(new URL('./runtime-manifest.json', import.meta.url), 'utf8'));
    const knownAssets = new Set(runtimeManifest.files.flatMap((file) => [file.id, ...(file.aliases ?? [])]));
    const farmland = runtimeManifest.files.find(({ id }) => id.startsWith('farmland/'));
    if (!farmland) throw new Error('Published runtime has no FarmLand frame');
    for (const profile of ['default', 'high']) {
      const resolved = new AssetManifestResolver(runtimeManifest, { baseUrl: 'https://assets.example/', profile }).resolve(farmland.id);
      if (resolved.variant.profile !== profile || !resolved.variant.frame) throw new Error(\`FarmLand \${profile} atlas-frame resolution failed\`);
    }
    const fileFetch = async (url) => new Response(await readFile(fileURLToPath(url)), { status: 200, headers: { 'content-type': 'application/json' } });
    for (let definition of await Promise.all([loadChiknRig(fileFetch), loadRoostrRig(fileFetch)])) {
      const species = definition.id;
      if (!definition.attachments.every(({ texture }) => texture.layoutScale === CHIKN_RIG_ART_SCALE[species])) throw new Error(\`\${species} layout scale is not portable\`);
      if (!definition.attachments.every(({ depthTarget }) => depthTarget === 'bone')) throw new Error(\`\${species} legacy depth is not bone-targeted\`);
      const missing = [...new Set(definition.attachments.map(({ texture }) => texture.assetId).filter((id) => !knownAssets.has(id)))];
      if (missing.length) throw new Error(\`Published runtime is missing \${definition.id} rig textures: \${missing.join(', ')}\`);
      const categories = new Set(Object.values(definition.attachmentGroups ?? {}).map(({ metadata }) => metadata?.category));
      for (const category of ['Head', 'Neck', 'Feet']) if (!categories.has(category)) throw new Error(\`\${species} is missing a \${category} trait group\`);
      for (const slotId of ['Wing A', 'Wing B', 'LegFoot A', 'LegFoot B']) if (!definition.slots.some(({ id }) => id === slotId)) throw new Error(\`\${species} is missing slot \${slotId}\`);
      for (const unique of UNIQUE_SKINS.filter(({ species: uniqueSpecies }) => uniqueSpecies === species)) {
        definition = mergeUniqueSkin(definition, unique, knownAssets);
        const uniqueAttachments = definition.attachments.filter(({ id }) => id.startsWith(\`unique:\${species}:\${unique.token}:\`));
        if (!uniqueAttachments.length || uniqueAttachments.some(({ texture }) => texture.layoutScale !== undefined)) throw new Error(\`\${species} unique artwork was incorrectly layout-scaled\`);
      }
      const rigErrors = validateRigDefinition(definition);
      if (rigErrors.length) throw new Error(\`Published runtime produced an invalid \${definition.id} rig: \${rigErrors.join(', ')}\`);
    }
  `);
  await exec(process.execPath, ['verify.mjs'], { cwd: directory });
  const catalog = JSON.parse(await readFile(join(directory, 'node_modules/@chikn-game-assets/runtime/catalog/asset-ids.json'), 'utf8'));
  if (!catalog.assetIds.length || !catalog.bundleIds.length) throw new Error('Published asset helper has no catalog metadata');
  if (catalog.codeLicense !== 'Apache-2.0' || catalog.contentTermsId !== 'CHIKN-COMMUNITY-NONCOMMERCIAL' || catalog.contentLicenseName !== 'Chikn Community Asset Pack Non-Commercial Licence' || catalog.contentLicenseVersion !== '1.1' || catalog.contentLicensePath !== 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md' || catalog.requiredAttribution !== requiredAttribution) throw new Error('Published catalog blurs code and protected-content boundaries');
  if (catalog.ownership !== 'third-party-chikn-rights-holder' || catalog.hostingAuthorized !== true || catalog.communityUseAuthorized !== true || catalog.sublicenseGrantedByRepository !== false) throw new Error('Published catalog blurs ownership or community-use boundaries');
  const runtimeManifest = JSON.parse(await readFile(join(directory, 'node_modules/@chikn-game-assets/runtime/package.json'), 'utf8'));
  if (runtimeManifest.license !== 'Apache-2.0') throw new Error('Published runtime helper is not Apache-2.0');
  console.log(`Cross-repository verification passed for @roost2d/*@${roost2dTag} and @chikn-game-assets/runtime@${chiknTag}.`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
