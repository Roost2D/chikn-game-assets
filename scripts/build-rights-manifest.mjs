import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { sourceSha256 } from './source-hash.mjs';

const root = resolve('.');
const selection = JSON.parse(await readFile(resolve('config/source-selection.json'), 'utf8'));
const policy = JSON.parse(await readFile(resolve('config/rights-policy.json'), 'utf8'));
const excludedPaths = new Set(policy.excludedPaths ?? []);
const metadataExtensions = new Set(policy.metadata?.extensions ?? []);
const projectVisualPaths = new Set(policy.projectVisuals?.paths ?? []);
const assets = [];

for (const source of selection.roots) {
  const sourceRoot = resolve(source.source);
  const categoryKey = relative(resolve('sources'), sourceRoot).split(sep)[0];
  const category = policy.categories[categoryKey];
  if (!category) throw new Error(`Missing rights category for ${categoryKey}`);

  for (const absolute of await walk(sourceRoot)) {
    const sourcePath = relative(root, absolute).split(sep).join('/');
    if (excludedPaths.has(sourcePath)) continue;

    const bytes = await readFile(absolute);
    const extension = extname(sourcePath).toLowerCase();
    const grant = metadataExtensions.has(extension)
      ? policy.metadata
      : projectVisualPaths.has(sourcePath)
        ? policy.projectVisuals
        : policy;
    const asset = {
      id: `rights/${sourcePath.replace(/^sources\//, '').split('/').map(slug).join('/')}`,
      sourcePath,
      category: grant.category ?? category,
      series: source.species,
      license: grant.license,
      commercialUse: grant.commercialUse,
      attribution: grant.attribution,
      sha256: sourceSha256(bytes, sourcePath),
    };

    if (grant.license === 'Apache-2.0') asset.approved = grant.approved;
    else Object.assign(asset, {
      ownership: grant.ownership,
      hostingAuthorized: grant.hostingAuthorized,
      communityUseAuthorized: grant.communityUseAuthorized,
      sublicenseGrantedByRepository: grant.sublicenseGrantedByRepository,
    });
    assets.push(asset);
  }
}

assets.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
const manifest = {
  schema: 'chikn-game-assets.rights/v1',
  version: policy.version,
  generatedAt: new Date(Number(process.env.SOURCE_DATE_EPOCH ?? 0) * 1000).toISOString(),
  assets,
  excludedPaths: [...excludedPaths].sort(),
};
await mkdir(resolve('manifests'), { recursive: true });
await writeFile(resolve('manifests/rights-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Recorded rights classifications for ${assets.length} source files.`);

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
