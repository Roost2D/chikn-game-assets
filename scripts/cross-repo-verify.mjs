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
    import { validateAssetManifest } from '@roost2d/contracts';
    import { AssetManifestResolver } from '@roost2d/assets';
    import { loadChiknPack, resolveManifestUrl } from '@chikn-game-assets/runtime';
    import { loadChiknRig, loadRoostrRig } from '@roost2d/chikn-rigs';
    const manifest = { schema: 'roost2d.assets/v1', version: '1', generatedAt: '1970-01-01T00:00:00.000Z', rightsDocumentSha256: 'a'.repeat(64), profiles: { default: { maxAtlasSize: 2048, scale: .5, gpuBudgetBytes: 64 } }, files: [{ id: 'example', mediaType: 'image/png', variants: [{ profile: 'default', path: 'runtime/example.png', bytes: 1, integrity: { algorithm: 'sha256', value: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' }, scale: .5 }] }], bundles: [] };
    if (validateAssetManifest(manifest).length) throw new Error('Published contracts rejected a valid manifest');
    new AssetManifestResolver(manifest, { baseUrl: 'https://assets.example/' });
    if (!resolveManifestUrl('https://assets.example/').pathname.endsWith('/runtime/manifest.json')) throw new Error('Runtime manifest resolver failed');
    const pack = await loadChiknPack({ manifestUrl: 'https://assets.example/runtime/manifest.json', fetch: async () => new Response(JSON.stringify(manifest)) });
    if (pack.findAsset('example')?.id !== 'example') throw new Error('Runtime pack adapter failed');
    const runtimeManifest = JSON.parse(await readFile(new URL('./runtime-manifest.json', import.meta.url), 'utf8'));
    const knownAssets = new Set(runtimeManifest.files.flatMap((file) => [file.id, ...(file.aliases ?? [])]));
    const fileFetch = async (url) => new Response(await readFile(fileURLToPath(url)), { status: 200, headers: { 'content-type': 'application/json' } });
    for (const definition of await Promise.all([loadChiknRig(fileFetch), loadRoostrRig(fileFetch)])) {
      const missing = [...new Set(definition.attachments.map(({ texture }) => texture.assetId).filter((id) => !knownAssets.has(id)))];
      if (missing.length) throw new Error(\`Published runtime is missing \${definition.id} rig textures: \${missing.join(', ')}\`);
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
