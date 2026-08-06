import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const errors = [];
const requiredAttribution = 'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm.';
const authoritativeDocuments = new Map([
  ['CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md', '8105f268b983d70200eff9563698088f40eee0fb45deb0de3ffed3573c58b4dd'],
  ['REPOSITORY-LICENSING-NOTICE_PUBLIC.md', '7128d7ad0f1a270074eab2b9db972035bcca7c8820dd994ab81637f909b6c923'],
]);
for (const [path, expectedSha256] of authoritativeDocuments) {
  const bytes = await readFile(resolve(path)).catch(() => undefined);
  if (!bytes) {
    errors.push(`${path}: authoritative Chikn document is missing`);
    continue;
  }
  const actualSha256 = createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== expectedSha256) errors.push(`${path}: authoritative Chikn document changed (${actualSha256})`);
}

const forbiddenPatterns = [
  [new RegExp(['CC', 'BY', 'NC', '4\\.0'].join('-'), 'i'), 'obsolete Creative Commons content identifier'],
  [new RegExp(['CC', 'BY-NC'].join(' '), 'i'), 'obsolete Creative Commons content wording'],
  [new RegExp([["creative", "commons\\.org"].join(''), 'licenses', ['by', 'nc'].join('-')].join('\\/'), 'i'), 'Creative Commons content URL'],
  [/existing community permission/i, 'obsolete informal permission wording'],
  [/existing community terms/i, 'obsolete informal terms wording'],
  [/hosted with permission for community non-commercial use/i, 'obsolete hosting-permission wording'],
];
for (const path of await publicTextFiles(resolve('.'))) {
  if (path.endsWith('verify-content-terms.mjs')) continue;
  const text = await readFile(path, 'utf8');
  for (const [pattern, label] of forbiddenPatterns) if (pattern.test(text)) errors.push(`${path.slice(resolve('.').length + 1)}: contains ${label}`);
}

const requiredPublicNotices = [
  ['apps/showcase/index.html', [requiredAttribution, 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md', 'REPOSITORY-LICENSING-NOTICE_PUBLIC.md', 'ATTRIBUTION.md']],
  ['docs/.vitepress/theme/index.ts', [requiredAttribution, 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md', 'REPOSITORY-LICENSING-NOTICE_PUBLIC.md', 'ATTRIBUTION.md']],
  ['ATTRIBUTION.md', [requiredAttribution, 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md']],
  ['CHIKN-COMMUNITY-ASSET-NOTICE.md', [requiredAttribution, 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md', 'REPOSITORY-LICENSING-NOTICE_PUBLIC.md']],
];
for (const [path, requiredText] of requiredPublicNotices) {
  const text = await readFile(resolve(path), 'utf8').catch(() => '');
  for (const value of requiredText) if (!text.includes(value)) errors.push(`${path}: public non-commercial notice is missing ${value}`);
}

if (errors.length) throw new Error(errors.join('\n'));
console.log('Verified Chikn licence v1.1, exact attribution, and public notices.');

async function publicTextFiles(directory) {
  const paths = [];
  const ignoredDirectories = new Set(['.git', '.release', 'node_modules', 'runtime', 'reports', 'dist', '.temp']);
  const textExtensions = new Set(['.md', '.json', '.mjs', '.ts', '.yml', '.yaml', '.txt']);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await publicTextFiles(path));
    else if (entry.isFile() && textExtensions.has(extname(entry.name))) paths.push(path);
  }
  return paths;
}
