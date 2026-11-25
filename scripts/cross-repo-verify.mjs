import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const requiredAttribution = 'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm.';
const roost2dTag = process.env.ROOST2D_TAG ?? 'next';
const chiknTag = process.env.CHIKN_ASSETS_TAG ?? 'next';
const contractsSpec = installSpec(process.env.ROOST2D_CONTRACTS_SPEC) ?? `@roost2d/contracts@${roost2dTag}`;
const assetsSpec = installSpec(process.env.ROOST2D_ASSETS_SPEC) ?? `@roost2d/assets@${roost2dTag}`;
const chiknRigsSpec = installSpec(process.env.ROOST2D_CHIKN_RIGS_SPEC) ?? `@roost2d/chikn-rigs@${roost2dTag}`;
const chiknAssetsSpec = installSpec(process.env.CHIKN_ASSETS_SPEC) ?? `@chikn-game-assets/runtime@${chiknTag}`;
const rig2dSpec = installSpec(process.env.ROOST2D_RIG2D_SPEC) ?? `@roost2d/rig2d@${roost2dTag}`;
const candidateDirectory = process.env.ROOST2D_LOCAL_PACKS_DIR;
const candidates = [];
if (candidateDirectory) {
  const index = JSON.parse(await readFile(resolve(candidateDirectory, 'packages.json'), 'utf8'));
  for (const entry of index.packages) {
    if (basename(entry.file) !== entry.file || !entry.file.endsWith('.tgz')) throw new Error('Invalid local candidate tarball path');
    const path = resolve(candidateDirectory, entry.file);
    if (createHash('sha256').update(await readFile(path)).digest('hex') !== entry.sha256) throw new Error(`Local candidate integrity changed: ${entry.file}`);
    candidates.push(path);
  }
}
const directory = await mkdtemp(join(tmpdir(), 'roost2d-cross-verify-'));
const npmArgs = (args) => process.platform === 'win32'
  ? [process.execPath, [resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), ...args]]
  : ['npm', args];

try {
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'roost2d-cross-verify', private: true, type: 'module' }));
  const [command, args] = npmArgs(['install', '--ignore-scripts', ...(candidates.length ? candidates : [contractsSpec, assetsSpec, chiknRigsSpec, rig2dSpec]), chiknAssetsSpec]);
  await exec(command, args, { cwd: directory });
  await cp(resolve('runtime/manifest.json'), join(directory, 'runtime-manifest.json'));
  await writeFile(join(directory, 'verify.mjs'), `
    import { readFile } from 'node:fs/promises';
    import { fileURLToPath } from 'node:url';
    import { validateAnimationClip, validateAssetManifest, validateRigDefinition } from '@roost2d/contracts';
    import { AssetManifestResolver } from '@roost2d/assets';
    import { loadChiknPack, loadCoqfightCatalog, loadCoqfightCharacter, resolveManifestUrl } from '@chikn-game-assets/runtime';
    import { RigRuntime } from '@roost2d/rig2d';
    import { gsap } from 'gsap';
    import { join } from 'node:path';
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
      const headGroups = Object.values(definition.attachmentGroups ?? {}).filter(group => String(group.metadata?.category).toLowerCase() === 'head');
      if (headGroups.length !== (species === 'chikn' ? 49 : 59)) throw new Error('Published headwear audit is incomplete');
      for (const group of headGroups) {
        if (!['covering', 'partial', 'accessory'].includes(group.metadata?.headCoverage)) throw new Error('Published headwear policy missing: ' + group.id);
        if (group.metadata.headCoverage === 'covering' && !group.slotClipPolygons?.Head) throw new Error('Published covering hat has no mask: ' + group.id);
        if (group.metadata.headCoverage === 'accessory' && group.slotClipPolygons?.Head) throw new Error('Published open accessory clips the head: ' + group.id);
      }
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
    // Exercise the real separate asset/helper/engine boundary without fetching any artwork.
    const contentRoot = ${JSON.stringify(resolve('.'))};
    const requests = [];
    const contentFetch = async (url) => {
      const path = decodeURIComponent(new URL(url).pathname).replace(/^\\//, '');
      requests.push(path);
      return new Response(await readFile(join(contentRoot, path)), {status:200});
    };
    for (const profile of ['default', 'high']) {
      const nativePack = await loadChiknPack({ baseUrl:'https://assets.example/', profile, fetch:contentFetch });
      const catalog = await loadCoqfightCatalog({pack:nativePack,fetch:contentFetch});
      for (const species of ['chikn','roostr']) {
        const character = await loadCoqfightCharacter({pack:nativePack,fetch:contentFetch,recipe:{schema:'chikn.coqfight-character/v1',setId:'coqfight-v1',species,bodySkinId:'Bullion',traitSkinIds:[],animationName:'Idle'}});
        if (validateRigDefinition(character.definition).length || character.clips.length !== catalog.animationNames.length) throw new Error('Native character/catalog mismatch');
        if (character.assetIds.length > 30) throw new Error('Native character preloads unselected skins/traits');
        let ordered = 0;
        const node=()=>({x:0,y:0,rotation:0,scaleX:1,scaleY:1});
        const rig=new RigRuntime(character.definition,{createBone:node,createAttachment:node,attach(){},destroy(){},setDrawOrder(nodes){ordered=nodes.length;}},character.clips);
        if(ordered !== character.definition.attachments.length) throw new Error('Native global slot order was not applied');
        for(const clip of character.clips){
          if(validateAnimationClip(clip,character.definition).length) throw new Error('Invalid native animation '+clip.id);
          const handle=rig.play(clip,{controlled:true,repeat:0});
          for(const portion of [0,.25,.5,1,.33]) handle.sample(clip.durationMs*portion);
          handle.kill();rig.resetPose();
        }
        rig.dispose();
      }
    }
    gsap.ticker.sleep();
    if(requests.some(path=>/\\.png$/.test(path))) throw new Error('Metadata loading unexpectedly downloaded artwork');
    console.log('Native selected-only loader and every pinned clip sampled for both species/profiles.');
  `);
  const verification = await exec(process.execPath, ['verify.mjs'], { cwd: directory });
  if (verification.stdout.trim()) console.log(verification.stdout.trim());
  const catalog = JSON.parse(await readFile(join(directory, 'node_modules/@chikn-game-assets/runtime/catalog/asset-ids.json'), 'utf8'));
  if (!catalog.assetIds.length || !catalog.bundleIds.length) throw new Error('Published asset helper has no catalog metadata');
  if (catalog.codeLicense !== 'Apache-2.0' || catalog.contentTermsId !== 'CHIKN-COMMUNITY-NONCOMMERCIAL' || catalog.contentLicenseName !== 'Chikn Community Asset Pack Non-Commercial Licence' || catalog.contentLicenseVersion !== '1.1' || catalog.contentLicensePath !== 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md' || catalog.requiredAttribution !== requiredAttribution) throw new Error('Published catalog blurs code and protected-content boundaries');
  if (catalog.ownership !== 'third-party-chikn-rights-holder' || catalog.hostingAuthorized !== true || catalog.communityUseAuthorized !== true || catalog.sublicenseGrantedByRepository !== false) throw new Error('Published catalog blurs ownership or community-use boundaries');
  const runtimeManifest = JSON.parse(await readFile(join(directory, 'node_modules/@chikn-game-assets/runtime/package.json'), 'utf8'));
  if (runtimeManifest.license !== 'Apache-2.0') throw new Error('Published runtime helper is not Apache-2.0');
  const engineDescription = candidates.length ? `local ${candidates.map((path) => basename(path)).join(', ')}` : `${contractsSpec}, ${assetsSpec}, ${chiknRigsSpec}, ${rig2dSpec}`;
  console.log(`Cross-repository verification passed for ${engineDescription}, and ${chiknAssetsSpec}.`);
} finally {
  if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('roost2d-cross-verify-')) throw new Error('Refusing to remove an unexpected verification directory');
  await rm(directory, { recursive: true, force: true });
}

function installSpec(value) {
  if (!value) return undefined;
  return /^(?:\.{0,2}[\\/]|[A-Za-z]:[\\/]|\/)/.test(value) ? resolve(value) : value;
}
