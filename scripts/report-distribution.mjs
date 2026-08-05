import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const exec = promisify(execFile);
const [{ stdout }, release] = await Promise.all([exec('git', ['lfs', 'ls-files', '--json'], { maxBuffer: 16 * 1024 * 1024 }), readJson('reports/release-size.json')]);
const lfs = JSON.parse(stdout).files ?? []; const unique = new Map();
for (const file of lfs) unique.set(file.oid, file.size);
const report = {
  schema: 'chikn-game-assets.distribution/v1', generatedAt: '1970-01-01T00:00:00.000Z',
  lfs: { logicalFiles: lfs.length, logicalBytes: lfs.reduce((sum, file) => sum + file.size, 0), uniqueObjects: unique.size, storageBytes: [...unique.values()].reduce((sum, size) => sum + size, 0), expectedFreshCloneBytes: lfs.reduce((sum, file) => sum + file.size, 0) },
  releases: { expectedSourceArchiveBytes: release.sourceBytes, expectedRuntimeArchiveBytes: release.runtimeBytes },
  runtime: { totalBytes: release.runtimeBytes, atlasPages: release.atlases.map(({ profile, path, bytes }) => ({ profile, path, bytes })) }
};
await writeFile(resolve('reports/distribution.json'), `${JSON.stringify(report, null, 2)}\n`); console.log(`Distribution report: ${lfs.length} LFS files, ${unique.size} unique objects, ${release.runtimeBytes} runtime bytes.`);
async function readJson(path) { return JSON.parse(await readFile(resolve(path), 'utf8')); }
