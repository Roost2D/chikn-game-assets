import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { zipDirectory } from '../release-archive.mjs';

const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

test('release ZIPs are byte-reproducible across source timestamp changes', { skip: process.platform !== 'win32' }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'chikn-release-archive-'));
  try {
    const source = join(root, 'source');
    await mkdir(join(source, 'nested'), { recursive: true });
    await writeFile(join(source, 'z.txt'), 'stable z\n');
    await writeFile(join(source, 'nested', 'a.txt'), 'stable a\n');
    const first = join(root, 'first.zip');
    const second = join(root, 'second.zip');
    await zipDirectory(source, first);
    await utimes(join(source, 'z.txt'), new Date('2026-01-01'), new Date('2026-01-01'));
    await utimes(join(source, 'nested', 'a.txt'), new Date('2030-01-01'), new Date('2030-01-01'));
    await zipDirectory(source, second);
    assert.equal(await sha256(first), await sha256(second));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('tag workflow includes the public licence and repository notice in the runtime archive', async () => {
  const workflow = await readFile(resolve('.github/workflows/release-assets.yml'), 'utf8');
  const runtimeArchiveCommand = workflow.split(/\r?\n/).find((line) => line.includes('-runtime.zip'));
  assert.ok(runtimeArchiveCommand, 'runtime archive command is missing');
  assert.match(runtimeArchiveCommand, /CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC\.md/);
  assert.match(runtimeArchiveCommand, /REPOSITORY-LICENSING-NOTICE_PUBLIC\.md/);
  assert.match(runtimeArchiveCommand, /manifests\/rights-manifest\.json/);
});

test('trusted publisher creates its tarball destination before npm pack', async () => {
  const workflow = await readFile(resolve('.github/workflows/publish.yml'), 'utf8');
  const createDirectoryIndex = workflow.indexOf('run: mkdir -p dist-pack');
  const packIndex = workflow.indexOf('npm pack -w @chikn-game-assets/runtime --pack-destination dist-pack');
  assert.notEqual(createDirectoryIndex, -1, 'dist-pack creation step is missing');
  assert.notEqual(packIndex, -1, 'npm pack step is missing');
  assert.ok(createDirectoryIndex < packIndex, 'dist-pack must exist before npm pack runs');
});

test('trusted publisher resolves exactly one downloaded tarball before publishing', async () => {
  const workflow = await readFile(resolve('.github/workflows/publish.yml'), 'utf8');
  const findIndex = workflow.indexOf("find \"$GITHUB_WORKSPACE\" -type f -name '*.tgz' -print");
  const countCheckIndex = workflow.indexOf('if [[ "${#tarballs[@]}" -ne 1 ]]');
  const publishIndex = workflow.indexOf('npm publish "${tarballs[0]}"');
  assert.notEqual(findIndex, -1, 'recursive tarball discovery is missing');
  assert.notEqual(countCheckIndex, -1, 'exactly-one tarball validation is missing');
  assert.notEqual(publishIndex, -1, 'resolved tarball publish step is missing');
  assert.ok(findIndex < countCheckIndex && countCheckIndex < publishIndex);
  assert.doesNotMatch(workflow, /npm publish dist-pack\/\*\.tgz/);
});
