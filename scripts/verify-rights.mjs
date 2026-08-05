import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { sourceSha256 } from './source-hash.mjs';

const root = resolve('.');
const sources = resolve('sources');
const manifest = JSON.parse(await readFile(resolve('manifests/rights-manifest.json'), 'utf8'));
const policy = JSON.parse(await readFile(resolve('config/rights-policy.json'), 'utf8'));
const errors = [];
const byPath = new Map();
const ids = new Set();
const excludedPaths = new Set();

if (manifest.schema !== 'chikn-game-assets.rights/v1') errors.push('Invalid rights-manifest schema');
for (const path of manifest.excludedPaths ?? []) {
  if (!path || excludedPaths.has(path)) errors.push(`Duplicate or empty excluded path: ${path}`);
  excludedPaths.add(path);
  try {
    await readFile(resolve(path));
  } catch {
    errors.push(`Excluded project material is missing: ${path}`);
  }
}

for (const asset of manifest.assets ?? []) {
  if (!asset.id || ids.has(asset.id)) errors.push(`Duplicate or empty rights id: ${asset.id}`);
  ids.add(asset.id);
  if (!asset.sourcePath || byPath.has(asset.sourcePath)) errors.push(`Duplicate or empty rights path: ${asset.sourcePath}`);
  byPath.set(asset.sourcePath, asset);
  if (excludedPaths.has(asset.sourcePath)) errors.push(`${asset.id}: excluded project material also has a release classification`);
  if (!asset.license || !asset.commercialUse || !asset.attribution) errors.push(`${asset.id}: incomplete rights classification`);

  if (/\.json$/i.test(asset.sourcePath) && (asset.license !== 'Apache-2.0' || asset.commercialUse !== 'allowed' || asset.approved !== true)) {
    errors.push(`${asset.id}: project metadata must be approved Apache-2.0 material`);
  }
  if (/\.(?:png|jpe?g)$/i.test(asset.sourcePath)) {
    if (asset.license !== 'CHIKN-COMMUNITY-NONCOMMERCIAL') errors.push(`${asset.id}: protected visual content must use the Chikn community terms identifier`);
    if (asset.ownership !== 'third-party-chikn-rights-holder') errors.push(`${asset.id}: protected visual ownership is missing`);
    if (asset.hostingAuthorized !== true || asset.communityUseAuthorized !== true) errors.push(`${asset.id}: hosting/community permission is incomplete`);
    if (asset.sublicenseGrantedByRepository !== false) errors.push(`${asset.id}: repository must not claim a sublicense`);
    if (asset.commercialUse !== 'separate-agreement-required') errors.push(`${asset.id}: commercial use boundary is incomplete`);
    if (asset.attribution !== policy.attribution) errors.push(`${asset.id}: attribution does not match the public content policy`);
  }
  if (!/^[a-f0-9]{64}$/.test(asset.sha256 ?? '')) errors.push(`${asset.id}: invalid SHA-256`);

  try {
    const bytes = await readFile(resolve(asset.sourcePath));
    if (sourceSha256(bytes, asset.sourcePath) !== asset.sha256) errors.push(`${asset.id}: source hash changed; refresh the technical manifest`);
  } catch {
    errors.push(`${asset.id}: source file is missing`);
  }
}

for (const absolute of await walk(sources)) {
  const sourcePath = relative(root, absolute).split(sep).join('/');
  if (!byPath.has(sourcePath) && !excludedPaths.has(sourcePath)) errors.push(`Unclassified source file: ${sourcePath}`);
}

if (errors.length) throw new Error(errors.join('\n'));
console.log(`Verified rights classifications and source hashes for ${byPath.size} source files.`);

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
