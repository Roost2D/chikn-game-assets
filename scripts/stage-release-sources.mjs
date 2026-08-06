import { cp, lstat, mkdir, readFile, readdir, realpath, rm, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { assertPortableRelativePath } from './manifest-utils.mjs';

const root = resolve('.');
const target = resolve(process.argv[2] ?? '.release/sources');
const relativeTarget = relative(root, target);
if (!relativeTarget || relativeTarget.startsWith(`..${sep}`) || relativeTarget === '..') throw new Error('Release staging directory must be inside the repository');
const canonicalRoot = await realpath(root);
await assertSafeTargetBeforeRemoval();

const manifest = JSON.parse(await readFile(resolve('manifests/rights-manifest.json'), 'utf8'));
const budgets = JSON.parse(await readFile(resolve('config/budgets.json'), 'utf8'));
for (const required of ['README.md', 'INTEGRATION.md', 'AGENTS.md', 'llms.txt', 'ASSET_CONTRIBUTIONS.md', 'SECURITY.md', 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md', 'REPOSITORY-LICENSING-NOTICE_PUBLIC.md', 'CHIKN-COMMUNITY-ASSET-NOTICE.md', 'config/source-selection.json', 'config/asset-aliases.json', 'config/rights-policy.json', 'docs/quick-start.md', 'docs/rights.md', 'docs/distribution.md']) {
  const contents = await readFile(resolve(required), 'utf8').catch(() => '');
  if (contents.trim().length < 200) throw new Error(`Missing or incomplete release integration document: ${required}`);
}
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const canonicalTarget = await realpath(target);
if (!isInside(canonicalRoot, canonicalTarget)) throw new Error('Release staging directory resolves outside the repository');

const copied = [];
const sourcesRoot = await realpath(resolve('sources'));
for (const asset of manifest.assets ?? []) {
  await copyManifestAsset(asset.sourcePath);
}
for (const path of ['manifests/rights-manifest.json', 'config/source-selection.json', 'config/asset-aliases.json', 'config/rights-policy.json', 'README.md', 'INTEGRATION.md', 'AGENTS.md', 'llms.txt', 'ASSET_CONTRIBUTIONS.md', 'SECURITY.md', 'LICENSE', 'LICENSE-CODE', 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md', 'REPOSITORY-LICENSING-NOTICE_PUBLIC.md', 'CHIKN-COMMUNITY-ASSET-NOTICE.md', 'ATTRIBUTION.md', 'COMMERCIAL_USE.md', 'TRADEMARKS.md', 'THIRD_PARTY_NOTICES.md']) {
  await copySupportDocument(path);
}
for (const entry of await readdir(resolve('docs'), { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.md')) await copySupportDocument(`docs/${entry.name}`);
}
try { await copySupportDocument('docs/public/llms.txt'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }

const stagedBytes = await totalBytes(target);
if (stagedBytes > budgets.sourceArchiveBytes) throw new Error(`Staged source archive is ${stagedBytes} bytes; budget is ${budgets.sourceArchiveBytes}`);
for (const excludedPath of manifest.excludedPaths ?? []) {
  assertPortableRelativePath(excludedPath, { prefix: 'sources/' });
  const staged = resolve(target, excludedPath);
  try { await stat(staged); throw new Error(`Excluded project material entered the source archive: ${excludedPath}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
}
console.log(`Staged ${copied.length} classified source/support files (${stagedBytes} bytes); excluded project materials are absent.`);

/**
 * Manifest-controlled input: the rights manifest names these paths, so prove both ends of the copy
 * before touching the filesystem. Lexical checks alone are not enough — a symlink anywhere along the
 * path would let a contained-looking path read outside sources/.
 */
async function copyManifestAsset(sourcePath) {
  assertPortableRelativePath(sourcePath, { prefix: 'sources/' });
  const absolute = resolve(sourcePath);
  const info = await lstat(absolute);
  if (info.isSymbolicLink()) throw new Error(`Symlinked release source is not classifiable: ${sourcePath}`);
  if (!info.isFile()) throw new Error(`Release source is not a regular file: ${sourcePath}`);
  const canonical = await realpath(absolute);
  if (canonical !== sourcesRoot && !canonical.startsWith(sourcesRoot + sep)) {
    throw new Error(`Release source resolves outside sources/: ${sourcePath}`);
  }
  await write(sourcePath, absolute);
}

/** Support paths are literals, but still refuse repository symlinks in standalone archives. */
async function copySupportDocument(path) {
  const absolute = resolve(path);
  const info = await lstat(absolute);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error(`Release support document is not a regular file: ${path}`);
  const canonical = await realpath(absolute);
  if (!isInside(canonicalRoot, canonical)) throw new Error(`Release support document resolves outside the repository: ${path}`);
  await write(path, canonical);
}

async function write(path, absolute) {
  const destination = resolve(target, path);
  if (destination !== target && !destination.startsWith(target + sep)) {
    throw new Error(`Staged destination escapes the staging directory: ${path}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  const canonicalParent = await realpath(dirname(destination));
  if (!isInside(canonicalTarget, canonicalParent)) throw new Error(`Staged destination resolves outside the staging directory: ${path}`);
  await cp(absolute, destination);
  copied.push(path);
}
async function totalBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    total += entry.isDirectory() ? await totalBytes(path) : (await stat(path)).size;
  }
  return total;
}

function isInside(parent, candidate) {
  return candidate === parent || candidate.startsWith(parent + sep);
}

/** Proves a target is contained before the destructive `rm`, including through missing parents. */
async function assertSafeTargetBeforeRemoval() {
  const info = await lstat(target).catch((error) => {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  });
  if (info?.isSymbolicLink()) throw new Error('Release staging directory must not be a symlink');
  if (info) {
    const canonical = await realpath(target);
    if (!isInside(canonicalRoot, canonical)) throw new Error('Release staging directory resolves outside the repository');
    return;
  }

  let ancestor = dirname(target);
  for (;;) {
    const canonical = await realpath(ancestor).catch((error) => {
      if (error?.code === 'ENOENT') return undefined;
      throw error;
    });
    if (canonical) {
      if (!isInside(canonicalRoot, canonical)) throw new Error('Release staging parent resolves outside the repository');
      return;
    }
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new Error('Unable to prove release staging containment');
    ancestor = parent;
  }
}
