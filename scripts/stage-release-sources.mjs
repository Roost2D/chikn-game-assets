import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const root = resolve('.');
const target = resolve(process.argv[2] ?? '.release/sources');
const relativeTarget = relative(root, target);
if (!relativeTarget || relativeTarget.startsWith(`..${sep}`) || relativeTarget === '..') throw new Error('Release staging directory must be inside the repository');

const manifest = JSON.parse(await readFile(resolve('manifests/rights-manifest.json'), 'utf8'));
const budgets = JSON.parse(await readFile(resolve('config/budgets.json'), 'utf8'));
for (const required of ['README.md', 'INTEGRATION.md', 'AGENTS.md', 'llms.txt', 'ASSET_CONTRIBUTIONS.md', 'CHIKN-COMMUNITY-ASSET-NOTICE.md', 'docs/quick-start.md', 'docs/rights.md', 'docs/distribution.md']) {
  const contents = await readFile(resolve(required), 'utf8').catch(() => '');
  if (contents.trim().length < 200) throw new Error(`Missing or incomplete release integration document: ${required}`);
}
await rm(target, { recursive: true, force: true });

const copied = [];
for (const asset of manifest.assets ?? []) {
  await copy(asset.sourcePath);
}
for (const path of ['manifests/rights-manifest.json', 'README.md', 'INTEGRATION.md', 'AGENTS.md', 'llms.txt', 'ASSET_CONTRIBUTIONS.md', 'LICENSE', 'LICENSE-CODE', 'CHIKN-COMMUNITY-ASSET-NOTICE.md', 'ATTRIBUTION.md', 'COMMERCIAL_USE.md', 'TRADEMARKS.md', 'THIRD_PARTY_NOTICES.md']) {
  await copy(path);
}
for (const entry of await readdir(resolve('docs'), { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.md')) await copy(`docs/${entry.name}`);
}
try { await copy('docs/public/llms.txt'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }

const stagedBytes = await totalBytes(target);
if (stagedBytes > budgets.sourceArchiveBytes) throw new Error(`Staged source archive is ${stagedBytes} bytes; budget is ${budgets.sourceArchiveBytes}`);
for (const excludedPath of manifest.excludedPaths ?? []) {
  const staged = resolve(target, excludedPath);
  try { await stat(staged); throw new Error(`Excluded project material entered the source archive: ${excludedPath}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
}
console.log(`Staged ${copied.length} classified source/support files (${stagedBytes} bytes); excluded project materials are absent.`);

async function copy(path) {
  const destination = resolve(target, path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(path), destination);
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
