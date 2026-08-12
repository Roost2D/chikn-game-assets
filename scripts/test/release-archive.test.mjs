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

test('tag workflow publishes the deterministic license-bearing release assembly', async () => {
  const [workflow, assembler] = await Promise.all([
    readFile(resolve('.github/workflows/release-assets.yml'), 'utf8'),
    readFile(resolve('scripts/assemble-release.mjs'), 'utf8'),
  ]);
  assert.match(workflow, /npm run release:assemble/);
  assert.match(workflow, /Get-ChildItem[^\n]+\.zip'[^\n]+\.tgz'/);
  assert.match(assembler, /CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC\.md/);
  assert.match(assembler, /REPOSITORY-LICENSING-NOTICE_PUBLIC\.md/);
  assert.match(assembler, /manifests\/rights-manifest\.json/);
  assert.match(assembler, /reports\/source-runtime-lineage\.json/);
  assert.match(assembler, /docs\/audio\.md/);
  assert.match(assembler, /CHANGELOG\.md/);
});

test('tag workflow emits portable checksums and marks release candidates as prereleases', async () => {
  const [workflow, assembler] = await Promise.all([
    readFile(resolve('.github/workflows/release-assets.yml'), 'utf8'),
    readFile(resolve('scripts/assemble-release.mjs'), 'utf8'),
  ]);
  assert.match(workflow, /Join-Path \$sourceDir 'SHA256SUMS'/);
  assert.match(workflow, /Join-Path \$sourceDir 'release\.json'/);
  assert.match(assembler, /\$\{hash\} \*\$\{name\}/);
  assert.match(workflow, /if \[\[ "\$GITHUB_REF_NAME" == \*-\* \]\]/);
  assert.match(workflow, /release_flags\+=\(--prerelease\)/);
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
  const [, publishJob] = workflow.split(/\n  publish:\r?\n/);
  assert.ok(publishJob, 'separate publish job is missing');
  assert.match(publishJob, /npm install --global npm@11\.5\.2/);
  assert.doesNotMatch(publishJob, /actions\/checkout@|npm ci/);
  const findIndex = publishJob.indexOf("find \"$GITHUB_WORKSPACE\" -type f -name '*.tgz' -print");
  const countCheckIndex = publishJob.indexOf('if [[ "${#tarballs[@]}" -ne 1 ]]');
  const publishIndex = publishJob.indexOf('npm publish "$tarball"');
  assert.notEqual(findIndex, -1, 'recursive tarball discovery is missing');
  assert.notEqual(countCheckIndex, -1, 'exactly-one tarball validation is missing');
  assert.notEqual(publishIndex, -1, 'resolved tarball publish step is missing');
  assert.ok(findIndex < countCheckIndex && countCheckIndex < publishIndex);
  assert.doesNotMatch(workflow, /npm publish dist-pack\/\*\.tgz/);
  assert.doesNotMatch(workflow, /--provenance/, 'OIDC publishes generate provenance automatically');
});

test('stable publishing verifies the exact candidate tarball against Roost2D latest', async () => {
  const workflow = await readFile(resolve('.github/workflows/publish.yml'), 'utf8');
  assert.match(workflow, /ROOST2D_TAG=latest CHIKN_ASSETS_SPEC="\$\{tarballs\[0\]\}" npm run cross:verify/);
  assert.doesNotMatch(workflow, /ROOST2D_TAG: next, CHIKN_ASSETS_TAG: next/);
});

test('runtime publishing is resumable and checks its requested dist-tag', async () => {
  const workflow = await readFile(resolve('.github/workflows/publish.yml'), 'utf8');
  assert.match(workflow, /npm view "\$package_spec" dist\.integrity/);
  assert.match(workflow, /published_tag" != "\$package_version/);
  assert.doesNotMatch(workflow, /npm dist-tag add/);
  assert.match(workflow, /for attempt in \{1\.\.6\}/);
  assert.match(workflow, /Registry postflight passed/);
});

test('cross-repository verification builds its local runtime manifest first', async () => {
  const packageManifest = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  assert.equal(
    packageManifest.scripts['cross:verify'],
    'npm run build && node scripts/cross-repo-verify.mjs',
  );
});

test('cross-repository verification constructs and validates every unique skin', async () => {
  const verifier = await readFile(resolve('scripts/cross-repo-verify.mjs'), 'utf8');
  assert.match(verifier, /mergeUniqueSkin/);
  assert.match(verifier, /UNIQUE_SKINS\.filter/);
  assert.match(verifier, /validateRigDefinition/);
});

test('cross-repository verification accepts exact local candidate package specs', async () => {
  const verifier = await readFile(resolve('scripts/cross-repo-verify.mjs'), 'utf8');
  for (const variable of ['ROOST2D_CONTRACTS_SPEC', 'ROOST2D_ASSETS_SPEC', 'ROOST2D_CHIKN_RIGS_SPEC', 'CHIKN_ASSETS_SPEC']) {
    assert.match(verifier, new RegExp(variable));
  }
});

test('cross-repository workflow checks out the authorized LFS asset bytes', async () => {
  const workflow = await readFile(resolve('.github/workflows/cross-repo-verify.yml'), 'utf8');
  const checkoutIndex = workflow.indexOf('actions/checkout@');
  const lfsIndex = workflow.indexOf('with: { lfs: true }', checkoutIndex);
  const setupNodeIndex = workflow.indexOf('actions/setup-node@', checkoutIndex);
  assert.notEqual(checkoutIndex, -1, 'checkout step is missing');
  assert.notEqual(lfsIndex, -1, 'checkout does not fetch LFS assets');
  assert.ok(lfsIndex < setupNodeIndex, 'LFS setting must belong to the checkout step');
});
