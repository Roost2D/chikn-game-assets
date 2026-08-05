import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createChiknAssetCache, fetchAssetBytes, loadChiknPack, resolveAssetUrl, selectVariant } from '../dist/index.js';

const ATLAS = new TextEncoder().encode('pretend this is an atlas page');
const sri = (bytes) => `sha256-${createHash('sha256').update(bytes).digest('base64')}`;

function manifestWith(variants, id = 'chikn/a') {
  return {
    schema: 'roost2d.assets/v1',
    version: '1',
    generatedAt: '1970-01-01T00:00:00.000Z',
    rightsDocumentSha256: 'a'.repeat(64),
    profiles: { default: { maxAtlasSize: 2048, scale: 0.5, gpuBudgetBytes: 64 } },
    files: [{ id, mediaType: 'image/png', variants }],
    bundles: [],
  };
}

const goodVariant = { profile: 'default', path: 'runtime/atlases/default/a.png', bytes: ATLAS.byteLength, integrity: { algorithm: 'sha256', value: sri(ATLAS) }, scale: 0.5 };

/** Serves `body` for atlas pages and the manifest for every other URL. */
function server(manifest, body = ATLAS, { status = 200 } = {}) {
  const calls = [];
  const fetch = async (url) => {
    const href = String(url);
    calls.push(href);
    if (href.endsWith('.png')) return new Response(body, { status });
    return new Response(JSON.stringify(manifest));
  };
  return { fetch, calls };
}

async function packFor(manifest, body, options = {}) {
  const { fetch, calls } = server(manifest, body);
  const pack = await loadChiknPack({ baseUrl: 'https://cdn.example/packs/v1/', fetch, ...options });
  return { pack, fetch, calls };
}

test('verified bytes are returned when the digest matches', async () => {
  const { pack, fetch } = await packFor(manifestWith([goodVariant]));
  const bytes = await fetchAssetBytes(pack, 'chikn/a', { fetch });
  assert.deepEqual(new Uint8Array(bytes), ATLAS);
});

test('corrupted bytes are rejected', async () => {
  const tampered = new TextEncoder().encode('pretend this is an atlas pagX');
  const { pack, fetch } = await packFor(manifestWith([goodVariant]), tampered);
  await assert.rejects(() => fetchAssetBytes(pack, 'chikn/a', { fetch }), /SHA-256 integrity mismatch/);
});

test('a byte-count mismatch is rejected before hashing', async () => {
  const short = new TextEncoder().encode('short');
  const { pack, fetch } = await packFor(manifestWith([goodVariant]), short);
  await assert.rejects(() => fetchAssetBytes(pack, 'chikn/a', { fetch }), /expected 29 bytes, got 5/);
});

test('an oversized response is aborted at the declared size', async () => {
  const huge = new Uint8Array(ATLAS.byteLength * 10);
  const { pack, fetch } = await packFor(manifestWith([goodVariant]), huge);
  await assert.rejects(() => fetchAssetBytes(pack, 'chikn/a', { fetch }), /exceeds 29 bytes/);
});

test('variant paths that escape the asset base are rejected', async () => {
  for (const path of ['HTTPS://evil.example/x.png', '//evil.example/x.png', '../../etc/passwd', '/etc/passwd', 'runtime/%2e%2e/x.png']) {
    const { pack, fetch } = await packFor(manifestWith([{ ...goodVariant, path }]));
    await assert.rejects(() => fetchAssetBytes(pack, 'chikn/a', { fetch }), /path must|escapes the asset base/, `${path} must be rejected`);
  }
});

test('asset URLs resolve against the base, not the manifest directory', async () => {
  const { pack } = await packFor(manifestWith([goodVariant]));
  assert.equal(resolveAssetUrl(pack, 'chikn/a').href, 'https://cdn.example/packs/v1/runtime/atlases/default/a.png');
});

test('a bare manifestUrl refuses to guess an asset base', async () => {
  const manifest = manifestWith([goodVariant]);
  const pack = await loadChiknPack({ manifestUrl: 'https://cdn.example/packs/v1/runtime/manifest.json', fetch: async () => new Response(JSON.stringify(manifest)) });
  assert.equal(pack.assetBaseUrl, undefined);
  assert.throws(() => resolveAssetUrl(pack, 'chikn/a'), /assetBaseUrl is required/);
});

test('an explicit assetBaseUrl alongside manifestUrl is honoured', async () => {
  const manifest = manifestWith([goodVariant]);
  const { fetch } = server(manifest);
  const pack = await loadChiknPack({ manifestUrl: 'https://cdn.example/odd/place.json', assetBaseUrl: 'https://cdn.example/packs/v1/', fetch });
  assert.equal(resolveAssetUrl(pack, 'chikn/a').href, 'https://cdn.example/packs/v1/runtime/atlases/default/a.png');
});

test('non-http asset base schemes are refused', async () => {
  const manifest = manifestWith([goodVariant]);
  await assert.rejects(
    () => loadChiknPack({ manifestUrl: 'https://cdn.example/manifest.json', assetBaseUrl: 'ftp://cdn.example/packs/', fetch: async () => new Response(JSON.stringify(manifest)) }),
    /must be http\(s\)/,
  );
});

test('non-http manifest schemes are refused', async () => {
  await assert.rejects(
    () => loadChiknPack({ manifestUrl: 'file:///etc/passwd', fetch: async () => new Response('{}') }),
    /must be http\(s\)/,
  );
});

test('a pinned manifest digest is enforced', async () => {
  const manifest = manifestWith([goodVariant]);
  const body = JSON.stringify(manifest);
  const digest = createHash('sha256').update(body).digest('hex');
  const fetch = async () => new Response(body);
  await loadChiknPack({ baseUrl: 'https://cdn.example/packs/v1/', fetch, expectedManifestSha256: digest });
  await assert.rejects(
    () => loadChiknPack({ baseUrl: 'https://cdn.example/packs/v1/', fetch, expectedManifestSha256: 'b'.repeat(64) }),
    /manifest digest mismatch/,
  );
});

test('profile selection falls back to default', async () => {
  const file = { id: 'chikn/a', mediaType: 'image/png', variants: [goodVariant] };
  assert.equal(selectVariant(file, 'high').profile, 'default');
  assert.equal(selectVariant(file, 'default').profile, 'default');
});

test('the cache downloads one shared atlas page once', async () => {
  const shared = { ...goodVariant };
  const manifest = manifestWith([shared]);
  manifest.files.push({ id: 'chikn/b', mediaType: 'image/png', variants: [shared] });
  const { fetch, calls } = server(manifest);
  const pack = await loadChiknPack({ baseUrl: 'https://cdn.example/packs/v1/', fetch });
  const cache = createChiknAssetCache(pack, { fetch });

  const [first, second] = await Promise.all([cache.fetch('chikn/a'), cache.fetch('chikn/b')]);
  assert.deepEqual(new Uint8Array(first), ATLAS);
  assert.deepEqual(new Uint8Array(second), ATLAS);
  assert.equal(calls.filter((href) => href.endsWith('a.png')).length, 1, 'shared atlas must be fetched once');
  assert.equal(cache.size, 1);

  assert.equal(cache.unload('chikn/b'), true, 'unload resolves the shared URL');
  assert.equal(cache.size, 0);
  cache.clear();
});

test('the cache never reuses bytes across conflicting integrity contracts', async () => {
  const manifest = manifestWith([goodVariant]);
  manifest.files.push({
    id: 'chikn/b', mediaType: 'image/png',
    variants: [{ ...goodVariant, integrity: { algorithm: 'sha256', value: `sha256-${'A'.repeat(43)}=` } }],
  });
  const { fetch, calls } = server(manifest);
  const pack = await loadChiknPack({ baseUrl: 'https://cdn.example/packs/v1/', fetch });
  const cache = createChiknAssetCache(pack, { fetch });
  await cache.fetch('chikn/a');
  await assert.rejects(() => cache.fetch('chikn/b'), /integrity mismatch/);
  assert.equal(calls.filter((href) => href.endsWith('a.png')).length, 2, 'conflicting verification contracts may not share a cache entry');
});

test('invalid transfer limits and integrity metadata fail before asset I/O', async () => {
  const manifest = manifestWith([goodVariant]);
  const { pack, fetch, calls } = await packFor(manifest);
  await assert.rejects(() => fetchAssetBytes(pack, 'chikn/a', { fetch, maxAssetBytes: 0 }), /positive safe integer/);
  assert.equal(calls.filter((href) => href.endsWith('.png')).length, 0);

  const invalid = manifestWith([{ ...goodVariant, integrity: { algorithm: 'sha256', value: 'not-sri' } }]);
  const invalidPack = await packFor(invalid);
  await assert.rejects(() => fetchAssetBytes(invalidPack.pack, 'chikn/a', { fetch: invalidPack.fetch }), /invalid SHA-256 integrity metadata/);
  assert.equal(invalidPack.calls.filter((href) => href.endsWith('.png')).length, 0);
});

test('a failed fetch is not cached', async () => {
  const tampered = new TextEncoder().encode('wrong bytes here, definitely!');
  const { pack, fetch } = await packFor(manifestWith([goodVariant]), tampered);
  const cache = createChiknAssetCache(pack, { fetch });
  await assert.rejects(() => cache.fetch('chikn/a'), /integrity mismatch/);
  assert.equal(cache.size, 0);
});
