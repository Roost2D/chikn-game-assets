import { cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

if (process.platform !== 'linux') throw new Error('Exact atlas-byte verification runs only in the Linux release container. Use npm run verify on Windows or macOS.');
const exec = promisify(execFile);
const snapshot = resolve('.repro-runtime-a');
await rm(snapshot, { recursive: true, force: true });
await cp(resolve('runtime'), snapshot, { recursive: true });
await exec(process.execPath, ['scripts/build-assets.mjs']);
await exec(process.execPath, ['scripts/verify-assets.mjs', '--compare-dir', snapshot]);
await rm(snapshot, { recursive: true, force: true });
