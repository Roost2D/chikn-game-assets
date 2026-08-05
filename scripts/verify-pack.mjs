import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';

const exec = promisify(execFile);
const budgets = JSON.parse(await readFile(resolve('config/budgets.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve('packages/runtime/package.json'), 'utf8'));
const readme = await readFile(resolve('packages/runtime/README.md'), 'utf8');
const catalog = JSON.parse(await readFile(resolve('packages/runtime/catalog/asset-ids.json'), 'utf8'));
if (manifest.license !== 'Apache-2.0') throw new Error('Runtime helper code must publish under Apache-2.0');
if (readme.length < 600 || !readme.includes('npm install')) throw new Error('Runtime package README must contain standalone integration guidance');
if (catalog.codeLicense !== 'Apache-2.0' || catalog.contentTermsId !== 'CHIKN-COMMUNITY-NONCOMMERCIAL') throw new Error('Runtime catalog must distinguish code and protected-content terms');
if (catalog.ownership !== 'third-party-chikn-rights-holder' || catalog.hostingAuthorized !== true || catalog.communityUseAuthorized !== true || catalog.sublicenseGrantedByRepository !== false) throw new Error('Runtime catalog blurs ownership or community-use boundaries');
const npmArgs = ['pack', '-w', '@chikn-game-assets/runtime', '--json', '--dry-run'];
const command = process.platform === 'win32' ? process.execPath : 'npm';
const args = process.platform === 'win32' ? [resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), ...npmArgs] : npmArgs;
const { stdout } = await exec(command, args);
const [pack] = JSON.parse(stdout);
if (!pack) throw new Error('npm pack did not return package metadata');
if (pack.unpackedSize > budgets.npmPackageBytes) throw new Error(`Runtime helper package unpacked size ${pack.unpackedSize} exceeds ${budgets.npmPackageBytes}`);
const names = new Set(pack.files.map((file) => file.path));
for (const required of ['catalog/asset-ids.json', 'ATTRIBUTION.md', 'COMMERCIAL_USE.md', 'LICENSE', 'CHIKN-COMMUNITY-ASSET-NOTICE.md']) if (!names.has(required)) throw new Error(`Package missing ${required}`);
for (const name of names) {
  if (/\.(?:png|jpe?g|webp|gif|zip)$/i.test(name)) throw new Error(`Runtime helper must not contain binary asset content: ${name}`);
  if (/^(?:runtime|sources|reports)\//.test(name)) throw new Error(`Runtime helper contains full asset distribution content: ${name}`);
}
console.log(`Verified ${pack.filename}: ${pack.size} packed bytes, ${pack.unpackedSize} unpacked bytes.`);
