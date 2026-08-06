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
  contentLicenseName: 'Chikn Community Asset Pack Non-Commercial Licence',
  contentLicenseVersion: '1.1',
  contentLicensePath: 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md',
  requiredAttribution: 'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm.',
  ownership: 'third-party-chikn-rights-holder',
  hostingAuthorized: true,
  communityUseAuthorized: true,
  commercialUse: 'separate-agreement-required',
  sublicenseGrantedByRepository: false,
  projectArtwork: {
    license: 'Apache-2.0',
    assetIds: manifest.files.filter(({ license }) => license === 'Apache-2.0').flatMap(({ id, aliases = [] }) => [id, ...aliases]).sort(),
  },
  assetIds: [...new Set(manifest.files.flatMap(({ id, aliases = [] }) => [id, ...aliases]))].sort(),
  bundleIds: manifest.bundles.map(({ id }) => id).sort()
};
await rm(resolve(packageRoot, 'catalog'), { recursive: true, force: true });
await mkdir(resolve(packageRoot, 'catalog'), { recursive: true });
await writeFile(resolve(packageRoot, 'catalog/asset-ids.json'), `${JSON.stringify(catalog, null, 2)}\n`);
for (const [source, destination] of [['LICENSE-CODE', 'LICENSE'], ['CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md', 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md'], ['REPOSITORY-LICENSING-NOTICE_PUBLIC.md', 'REPOSITORY-LICENSING-NOTICE_PUBLIC.md'], ['CHIKN-COMMUNITY-ASSET-NOTICE.md', 'CHIKN-COMMUNITY-ASSET-NOTICE.md'], ['ATTRIBUTION.md', 'ATTRIBUTION.md'], ['COMMERCIAL_USE.md', 'COMMERCIAL_USE.md']]) await cp(resolve(repositoryRoot, source), resolve(packageRoot, destination));
