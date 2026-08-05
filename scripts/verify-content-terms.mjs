import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const errors = [];
const forbiddenPatterns = [
  [new RegExp(['CC', 'BY', 'NC', '4\\.0'].join('-'), 'i'), 'obsolete Creative Commons content identifier'],
  [new RegExp(['CC', 'BY-NC'].join(' '), 'i'), 'obsolete Creative Commons content wording'],
  [new RegExp([["creative", "commons\\.org"].join(''), 'licenses', ['by', 'nc'].join('-')].join('\\/'), 'i'), 'Creative Commons content URL'],
];
for (const path of await publicTextFiles(resolve('.'))) {
  if (path.endsWith('verify-content-terms.mjs')) continue;
  const text = await readFile(path, 'utf8');
  for (const [pattern, label] of forbiddenPatterns) if (pattern.test(text)) errors.push(`${path.slice(resolve('.').length + 1)}: contains ${label}`);
}

const requiredPublicNotices = [
  ['apps/showcase/index.html', ['hosted with permission for community non-commercial use', 'CHIKN-COMMUNITY-ASSET-NOTICE.md', 'ATTRIBUTION.md', 'COMMERCIAL_USE.md']],
  ['docs/.vitepress/theme/index.ts', ['hosted with permission', 'CHIKN-COMMUNITY-ASSET-NOTICE.md', 'ATTRIBUTION.md', 'COMMERCIAL_USE.md']],
];
for (const [path, requiredText] of requiredPublicNotices) {
  const text = await readFile(resolve(path), 'utf8').catch(() => '');
  for (const value of requiredText) if (!text.includes(value)) errors.push(`${path}: public non-commercial notice is missing ${value}`);
}

if (errors.length) throw new Error(errors.join('\n'));
console.log('Verified public Chikn community-use terms and notices.');

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
