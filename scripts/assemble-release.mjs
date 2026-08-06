import { execFile } from 'node:child_process';
import { cp, mkdir, readFile, realpath, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { zipDirectory } from './release-archive.mjs';

const exec = promisify(execFile);
const root = resolve('.');
const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const version = packageJson.version;
if (!/^0\.1\.0-rc\.2$/.test(version)) throw new Error(`Refusing to assemble an unexpected release version: ${version}`);

const release = resolve(`.release/v${version}`);
await assertContainedReleaseDirectory(release);
await rm(release, { recursive: true, force: true });
await mkdir(release, { recursive: true });

const stageScript = resolve('scripts/stage-release-sources.mjs');
await exec(process.execPath, [stageScript, resolve(release, 'sources')], { cwd: root });
await cp(resolve('runtime'), resolve(release, 'runtime'), { recursive: true, force: false, dereference: false });
await cp(resolve('manifests/rights-manifest.json'), resolve(release, 'runtime/rights-manifest.json'));
await cp(resolve('CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md'), resolve(release, 'runtime/CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md'));
await cp(resolve('REPOSITORY-LICENSING-NOTICE_PUBLIC.md'), resolve(release, 'runtime/REPOSITORY-LICENSING-NOTICE_PUBLIC.md'));
await cp(resolve('CHIKN-COMMUNITY-ASSET-NOTICE.md'), resolve(release, 'runtime/CHIKN-COMMUNITY-ASSET-NOTICE.md'));
await cp(resolve('ATTRIBUTION.md'), resolve(release, 'runtime/ATTRIBUTION.md'));
await cp(resolve('COMMERCIAL_USE.md'), resolve(release, 'runtime/COMMERCIAL_USE.md'));

const runtimeZip = `chikn-game-assets-v${version}-runtime.zip`;
const sourceZip = `chikn-game-assets-v${version}-source.zip`;
await zipDirectory(resolve(release, 'runtime'), resolve(release, runtimeZip));
await zipDirectory(resolve(release, 'sources'), resolve(release, sourceZip));

const npmCli = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
await exec(process.execPath, [npmCli, 'pack', '--workspace', '@chikn-game-assets/runtime', '--pack-destination', release, '--ignore-scripts'], { cwd: root });

const releaseFiles = (await readdir(release, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name !== 'SHA256SUMS' && entry.name !== 'release.json')
  .map((entry) => entry.name)
  .sort();
const checksums = Object.fromEntries(await Promise.all(releaseFiles.map(async (name) => [name, await sha256(resolve(release, name))])));
await writeFile(resolve(release, 'SHA256SUMS'), Object.entries(checksums).map(([name, hash]) => `${hash} *${name}`).join('\n') + '\n');
await writeFile(resolve(release, 'release.json'), JSON.stringify({
  schema: 'chikn-game-assets/release/v1',
  version,
  runtimeManifestSha256: await sha256(resolve('runtime/manifest.json')),
  rightsManifestSha256: await sha256(resolve('manifests/rights-manifest.json')),
  contentLicenseSha256: await sha256(resolve('CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md')),
  repositoryLicensingNoticeSha256: await sha256(resolve('REPOSITORY-LICENSING-NOTICE_PUBLIC.md')),
  artifacts: checksums,
}, null, 2) + '\n');

console.log(`Assembled ${release} with ${releaseFiles.length} signed-by-checksum artifacts.`);

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function assertContainedReleaseDirectory(target) {
  const relativeTarget = relative(root, target);
  if (!relativeTarget || relativeTarget === '..' || relativeTarget.startsWith(`..${sep}`)) {
    throw new Error('Release directory must be inside the repository');
  }
  let ancestor = dirname(target);
  for (;;) {
    const canonical = await realpath(ancestor).catch((error) => error?.code === 'ENOENT' ? undefined : Promise.reject(error));
    if (canonical) {
      const canonicalRoot = await realpath(root);
      if (canonical !== canonicalRoot && !canonical.startsWith(canonicalRoot + sep)) throw new Error('Release directory escapes repository through a link');
      return;
    }
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new Error('Could not prove release directory containment');
    ancestor = parent;
  }
}
