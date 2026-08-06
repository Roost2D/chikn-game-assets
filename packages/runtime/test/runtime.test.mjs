import assert from 'node:assert/strict';
import test from 'node:test';
import { CHIKN_CONTENT_TERMS, CHIKN_RUNTIME_LICENSE, createChiknRig, loadChiknPack, resolveManifestUrl } from '../dist/index.js';

test('code and visual content expose separate license identifiers', () => {
  assert.equal(CHIKN_RUNTIME_LICENSE, 'Apache-2.0');
  assert.deepEqual(CHIKN_CONTENT_TERMS, {
    licenseId: 'CHIKN-COMMUNITY-NONCOMMERCIAL',
    licenseName: 'Chikn Community Asset Pack Non-Commercial Licence',
    licenseVersion: '1.1',
    licensePath: 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md',
    requiredAttribution: 'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm.',
    ownership: 'third-party-chikn-rights-holder',
    hostingAuthorized: true,
    communityUseAuthorized: true,
    commercialUse: 'separate-agreement-required',
    sublicenseGrantedByRepository: false,
    noticePath: 'CHIKN-COMMUNITY-ASSET-NOTICE.md',
  });
});

test('manifest hosts remain caller supplied', () => { assert.equal(resolveManifestUrl('https://cdn.example/packs/v1/').href, 'https://cdn.example/packs/v1/runtime/manifest.json'); });
test('pack loader indexes canonical ids and aliases', async () => {
  const manifest = { schema: 'roost2d.assets/v1', version: '1', generatedAt: 'x', rightsDocumentSha256: 'a'.repeat(64), profiles: {}, files: [{ id: 'chikn/a', aliases: ['a'], mediaType: 'image/png', variants: [] }], bundles: [{ id: 'chikn', lazy: true, items: [] }] };
  const pack = await loadChiknPack({ manifestUrl: 'https://cdn.example/manifest.json', fetch: async () => new Response(JSON.stringify(manifest)) });
  assert.equal(pack.findAsset('a').id, 'chikn/a');
  assert.deepEqual(pack.assetIds, ['chikn/a', 'a']);
});
test('rig adapter remains renderer and engine independent', async () => { const runtime = await createChiknRig({ loadDefinition: async () => ({ id: 'chikn' }), create: (definition) => ({ definition, skin: '' }), skin: 'white', applySkin: (value, skin) => { value.skin = skin; } }); assert.equal(runtime.skin, 'white'); });
