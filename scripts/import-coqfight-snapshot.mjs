import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { sourceSha256 } from './source-hash.mjs';

const root = resolve('.');
const output = 'sources/coqfight-v1';
const lockPath = 'config/coqfight-v1.lock.json';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const json = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const writeJson = async (path, value) => { await mkdir(dirname(resolve(path)), { recursive: true }); await writeFile(resolve(path), JSON.stringify(value, null, 2) + '\n'); };

if (!process.argv.includes('--refresh')) {
  const lock = await json(lockPath);
  for (const entry of [...lock.documents, ...lock.images]) {
    const bytes = await readFile(resolve(entry.sourcePath));
    if (sha(bytes) !== entry.sha256) throw new Error(`Pinned Coqfight source changed: ${entry.sourcePath}`);
  }
  console.log(`Verified pinned Coqfight snapshot: ${lock.documents.length} documents and ${lock.images.length} image references.`);
  process.exit(0);
}

const base = 'https://assets.chikn.farm/';
const documents = [];
const images = [];
const selection = await json('config/source-selection.json');
const aliases = await json('config/asset-aliases.json');
const known = new Map();
for (const group of selection.roots.filter(({ source }) => /^sources\/traits-(chikn|roostr)$/.test(source))) {
  for (const path of await walk(resolve(group.source))) {
    if (!path.endsWith('.png')) continue;
    const bytes = await readFile(path);
    const sourcePath = relative(root, path).split(sep).join('/');
    const name = relative(resolve(group.source), path).split(sep).join('/').replace(/\.png$/, '');
    known.set(sha(bytes), { sourcePath, assetId: `${group.group}/${name.split('/').map(slug).join('/')}` });
  }
}
for (const path of ['llms.txt', 'LICENSE.md', 'v1/traits/traits.json', 'v1/traits/trait-rules.json', ...['chikn', 'roostr'].flatMap((species) => [`v1/${species}/${species}.json`, `v1/${species}/${species}-animations-meta.json`])]) {
  const url = base + path;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sourcePath = `${output}/${path.replace(/^v1\//, '')}`;
  await mkdir(dirname(resolve(sourcePath)), { recursive: true });
  await writeFile(resolve(sourcePath), bytes);
  documents.push({ url, sourcePath, bytes: bytes.length, sha256: sha(bytes), canonicalSha256: sourceSha256(bytes, sourcePath), lastModified: response.headers.get('last-modified') });
}
const tasks = [];
for (const species of ['chikn', 'roostr']) {
  const skeleton = await json(`${output}/${species}/${species}.json`);
  const paths = new Map();
  for (const skin of skeleton.skins) for (const attachments of Object.values(skin.attachments ?? {})) for (const [name, attachment] of Object.entries(attachments)) paths.set(attachment.path ?? name, skin.name);
  for (const [path, skinId] of paths) tasks.push({ species, path, skinId });
}
let completed = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (tasks.length) {
    const { species, path, skinId } = tasks.shift();
    const url = `${base}v1/${species}/images/${path.split('/').map(encodeURIComponent).join('/')}.png`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = sha(bytes);
    let canonical = known.get(hash);
    if (!canonical) {
      const directory = skinId === 'default' ? 'Base/_shared' : skinId.startsWith('trait/') ? `Coqfight-v1/${skinId.slice(6)}` : `Base/${skinId}`;
      const sourcePath = `sources/traits-${species}/${directory}/coqfight-v1-${hash.slice(0, 20)}.png`;
      const assetId = `${species}-traits/${directory.split('/').map(slug).join('/')}/coqfight-v1-${hash.slice(0, 20)}`;
      canonical = { sourcePath, assetId };
      known.set(hash, canonical);
      await mkdir(dirname(resolve(sourcePath)), { recursive: true });
      await writeFile(resolve(sourcePath), bytes);
    }
    const assetId = `coqfight-v1/${species}/images/${path}`;
    const values = aliases.aliases[canonical.assetId] ??= [];
    if (!values.includes(assetId)) values.push(assetId);
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Expected a PNG: ${url}`);
    images.push({ url, species, path, skinId, ...canonical, alias: assetId, bytes: bytes.length, sha256: hash, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
    completed += 1;
    if (completed % 100 === 0) console.log(`Fetched ${completed} official image references.`);
  }
}));
images.sort((a, b) => a.alias.localeCompare(b.alias));
for (const values of Object.values(aliases.aliases)) values.sort();
await writeJson('config/asset-aliases.json', aliases);
await writeJson(lockPath, { schema: 'chikn.coqfight-source-lock/v1', setId: 'coqfight-v1', source: base, snapshotDate: '2026-11-25', snapshotCutoffUtc: new Date().toISOString(), documents, images });
console.log(`Pinned ${documents.length} documents and ${images.length} official image references; ${new Set(images.map(({ sourcePath }) => sourcePath)).size} canonical PNGs.`);

async function walk(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths;
}
