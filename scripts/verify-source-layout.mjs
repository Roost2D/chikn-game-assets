import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const root = resolve('.');
const errors = [];
const retiredRoots = [
  'sources/chikn-flat',
  'sources/roostr-flat',
  'sources/rig-chikn',
  'sources/rig-roostr',
];

for (const path of retiredRoots) {
  try {
    await access(resolve(path));
    errors.push(`Retired duplicate source root was reintroduced: ${path}`);
  } catch {}
}

for (const path of [
  'sources/chikn-atlas/chikn-Atlas.json',
  'sources/chikn-atlas/chikn-Atlas.png',
  'sources/roostr-atlas/roostr-Atlas.json',
  'sources/roostr-atlas/roostr-Atlas.png',
  'sources/audio',
  'sources/traits-chikn/Base',
  'sources/traits-roostr/Base',
]) {
  try { await access(resolve(path)); } catch { errors.push(`Canonical source input is missing: ${path}`); }
}

const aliases = JSON.parse(await readFile(resolve('config/asset-aliases.json'), 'utf8'));
if (aliases.schema !== 'chikn-game-assets.asset-aliases/v1') errors.push('Invalid asset-aliases schema');
const references = new Set();
for (const [assetId, values] of Object.entries(aliases.aliases ?? {})) {
  if (!assetId || !Array.isArray(values) || !values.length) errors.push(`Invalid compatibility aliases for ${assetId || '<empty>'}`);
  for (const value of values ?? []) {
    if (!value || references.has(value)) errors.push(`Duplicate or empty compatibility alias: ${value}`);
    references.add(value);
  }
}

const sourceFiles = await walk(resolve('sources'));
const images = sourceFiles.filter((path) => /\.(?:png|jpe?g)$/i.test(path));
const audio = sourceFiles.filter((path) => /\.mp3$/i.test(path));
const audioSidecars = sourceFiles.filter((path) => path.startsWith(resolve('sources/audio') + sep) && /\.meta$/i.test(path));
if (audioSidecars.length) errors.push(`Unity audio sidecars must not enter the repository: ${audioSidecars.map((path) => relative(root, path).split(sep).join('/')).join(', ')}`);
await verifyUniqueBinarySources(images, 'images');
await verifyUniqueBinarySources(audio, 'audio files');

if (errors.length) throw new Error(errors.join('\n'));
console.log(`Verified canonical source layout with ${images.length} unique images and ${audio.length} unique audio files.`);

async function verifyUniqueBinarySources(pathsToVerify, label) {
  const byHash = new Map();
  for (const absolute of pathsToVerify) {
    const bytes = await readFile(absolute);
    const head = bytes.subarray(0, 64).toString('utf8');
    const sourcePath = relative(root, absolute).split(sep).join('/');
    if (head.startsWith('version https://git-lfs.github.com/spec/v1')) errors.push(`Git LFS pointer was not materialized: ${sourcePath}`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const paths = byHash.get(hash) ?? [];
    paths.push(sourcePath);
    byHash.set(hash, paths);
  }
  for (const paths of byHash.values()) if (paths.length > 1) errors.push(`Exact duplicate source ${label} must be represented by aliases, not copied files: ${paths.join(', ')}`);
}

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}
