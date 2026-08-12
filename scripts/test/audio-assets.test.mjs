import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import test from 'node:test';

const root = resolve('.');

test('all classified source MP3s are published with integrity and lineage', async () => {
  const sourceRoot = resolve('sources/audio');
  const sourceFiles = await walk(sourceRoot);
  const sourceMp3s = sourceFiles.filter((path) => path.toLowerCase().endsWith('.mp3')).sort();
  assert.equal(sourceMp3s.length, 79, 'the complete approved EggCatch audio corpus must be present');
  assert.equal(sourceFiles.some((path) => path.toLowerCase().endsWith('.meta')), false, 'Unity .meta sidecars are not repository assets');

  const [manifest, rights, lineage, releaseSize] = await Promise.all([
    readJson('runtime/manifest.json'),
    readJson('manifests/rights-manifest.json'),
    readJson('reports/source-runtime-lineage.json'),
    readJson('reports/release-size.json'),
  ]);
  const audioAssets = manifest.files.filter(({ id }) => id.startsWith('audio/'));
  assert.equal(audioAssets.length, sourceMp3s.length);
  assert.deepEqual(new Set(audioAssets.map(({ kind }) => kind)), new Set(['audio']));
  assert.deepEqual(new Set(audioAssets.map(({ mediaType }) => mediaType)), new Set(['audio/mpeg']));

  const rightsByPath = new Map(rights.assets.map((entry) => [entry.sourcePath, entry]));
  const lineageById = new Map(lineage.assets.map((entry) => [entry.assetId, entry]));
  const seenPaths = new Set();
  for (const asset of audioAssets) {
    assert.deepEqual(asset.variants.map(({ profile }) => profile).sort(), ['default', 'high']);
    assert.equal(new Set(asset.variants.map(({ path }) => path)).size, 1, `${asset.id} must share immutable bytes across profiles`);
    const variant = asset.variants[0];
    assert.match(variant.path, /^runtime\/audio\/.+\.mp3$/);
    const runtimeBytes = await readFile(resolve(variant.path));
    assert.equal((await stat(resolve(variant.path))).size, variant.bytes);
    assert.equal(`sha256-${createHash('sha256').update(runtimeBytes).digest('base64')}`, variant.integrity.value);

    const sourcePaths = lineageById.get(asset.id)?.sourcePaths ?? [];
    assert.equal(sourcePaths.length, 1, `${asset.id} must map to exactly one original MP3`);
    const sourceBytes = await readFile(resolve(sourcePaths[0]));
    assert.deepEqual(runtimeBytes, sourceBytes, `${asset.id} runtime bytes must remain original and untranscoded`);
    seenPaths.add(sourcePaths[0]);
    const sourceRights = rightsByPath.get(sourcePaths[0]);
    assert.ok(sourceRights, `${asset.id} is missing a rights record`);
    assert.equal(sourceRights.sha256, createHash('sha256').update(sourceBytes).digest('hex'));
    assert.equal(sourceRights.license, 'CHIKN-COMMUNITY-NONCOMMERCIAL');
    assert.equal(sourceRights.hostingAuthorized, true);
    assert.equal(sourceRights.communityUseAuthorized, true);
    assert.equal(sourceRights.sublicenseGrantedByRepository, false);
  }

  assert.deepEqual(
    [...seenPaths].sort(),
    sourceMp3s.map((path) => relative(root, path).split(sep).join('/')).sort(),
  );
  const audioBundle = manifest.bundles.find(({ id }) => id === 'audio');
  assert.equal(audioBundle?.items.length, sourceMp3s.length);
  assert.equal(releaseSize.directFiles.length, sourceMp3s.length);
});

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
