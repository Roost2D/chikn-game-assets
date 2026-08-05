import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve('.');
const repositoryRoot = resolve('../..');
const manifest = JSON.parse(await readFile(resolve(repositoryRoot, 'runtime/manifest.json'), 'utf8'));
for (const obsoleteDirectory of ['runtime', 'sources', 'reports']) {
  await rm(resolve(packageRoot, obsoleteDirectory), { recursive: true, force: true });
}
const catalog = {
  schema: 'chikn-game-assets.catalog/v1',
  version: manifest.version,
  generatedAt: manifest.generatedAt,
  codeLicense: 'Apache-2.0',
  contentTermsId: 'CHIKN-COMMUNITY-NONCOMMERCIAL',
  ownership: 'third-party-chikn-rights-holder',
  hostingAuthorized: true,
  communityUseAuthorized: true,
  commercialUse: 'separate-agreement-required',
  sublicenseGrantedByRepository: false,
  assetIds: manifest.files.map(({ id }) => id).sort(),
  bundleIds: manifest.bundles.map(({ id }) => id).sort()
};
await rm(resolve(packageRoot, 'catalog'), { recursive: true, force: true });
await mkdir(resolve(packageRoot, 'catalog'), { recursive: true });
await writeFile(resolve(packageRoot, 'catalog/asset-ids.json'), `${JSON.stringify(catalog, null, 2)}\n`);
for (const [source, destination] of [['LICENSE-CODE', 'LICENSE'], ['CHIKN-COMMUNITY-ASSET-NOTICE.md', 'CHIKN-COMMUNITY-ASSET-NOTICE.md'], ['ATTRIBUTION.md', 'ATTRIBUTION.md'], ['COMMERCIAL_USE.md', 'COMMERCIAL_USE.md']]) await cp(resolve(repositoryRoot, source), resolve(packageRoot, destination));
