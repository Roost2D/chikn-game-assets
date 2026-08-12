import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const exec = promisify(execFile);
const [{ stdout }, release] = await Promise.all([
  exec('git', ['ls-files', '--', '*.png', '*.jpg', '*.jpeg', '*.webp', '*.mp3', '*.zip'], { maxBuffer: 16 * 1024 * 1024 }),
  readJson('reports/release-size.json'),
]);
const paths = stdout.split(/\r?\n/).filter(Boolean);
const lfs = await Promise.all(paths.map(async (path) => {
  const bytes = await readFile(resolve(path));
  if (bytes.subarray(0, 64).toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1')) throw new Error(`Git LFS pointer was not materialized: ${path}`);
  return { path, size: bytes.byteLength, oid: createHash('sha256').update(bytes).digest('hex') };
}));
const unique = new Map();
for (const file of lfs) unique.set(file.oid, file.size);
const report = {
  schema: 'chikn-game-assets.distribution/v1', generatedAt: '1970-01-01T00:00:00.000Z',
  lfs: { logicalFiles: lfs.length, logicalBytes: lfs.reduce((sum, file) => sum + file.size, 0), uniqueObjects: unique.size, storageBytes: [...unique.values()].reduce((sum, size) => sum + size, 0), expectedFreshCloneBytes: lfs.reduce((sum, file) => sum + file.size, 0) },
  releases: { expectedSourceArchiveBytes: release.sourceBytes, expectedRuntimeArchiveBytes: release.runtimeBytes },
  runtime: { totalBytes: release.runtimeBytes, atlasPages: release.atlases.map(({ profile, path, bytes }) => ({ profile, path, bytes })), directFiles: release.directFiles ?? [] }
};
await writeFile(resolve('reports/distribution.json'), `${JSON.stringify(report, null, 2)}\n`); console.log(`Distribution report: ${lfs.length} LFS files, ${unique.size} unique objects, ${release.runtimeBytes} runtime bytes.`);
async function readJson(path) { return JSON.parse(await readFile(resolve(path), 'utf8')); }
