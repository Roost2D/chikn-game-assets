import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { zipDirectory } from '../release-archive.mjs';

const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

test('release ZIPs are byte-reproducible across source timestamp changes', { skip: process.platform !== 'win32' }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'chikn-release-archive-'));
  try {
    const source = join(root, 'source');
    await mkdir(join(source, 'nested'), { recursive: true });
    await writeFile(join(source, 'z.txt'), 'stable z\n');
    await writeFile(join(source, 'nested', 'a.txt'), 'stable a\n');
    const first = join(root, 'first.zip');
    const second = join(root, 'second.zip');
    await zipDirectory(source, first);
    await utimes(join(source, 'z.txt'), new Date('2026-01-01'), new Date('2026-01-01'));
    await utimes(join(source, 'nested', 'a.txt'), new Date('2030-01-01'), new Date('2030-01-01'));
    await zipDirectory(source, second);
    assert.equal(await sha256(first), await sha256(second));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
