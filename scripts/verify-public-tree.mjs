import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const exec = promisify(execFile); const { stdout } = await exec('git', ['ls-files']); const paths = stdout.split(/\r?\n/).filter(Boolean); const errors = [];
const prohibited = [/(^|\/)\.env(?:\.|$)/i, /\.(?:exe|dll|dylib|so|pem|p12|key|psd|ai)$/i, /(^|\/)(?:private|unapproved|secrets?)(\/|$)/i, /(^|\/)node_modules\//];
for (const path of paths) {
  if (prohibited.some((pattern) => pattern.test(path))) errors.push(`Prohibited public path: ${path}`);
  if (/\.(?:png|jpe?g|webp|zip)$/i.test(path)) {
    const { stdout: attribute } = await exec('git', ['check-attr', 'filter', '--', path]); if (!attribute.trim().endsWith(': lfs')) errors.push(`Binary source is not tracked by Git LFS: ${path}`);
  }
  if (/\.(?:json|md|mjs|ts|yml|yaml)$/i.test(path) && !path.startsWith('reports/')) {
    const text = await readFile(path, 'utf8').catch(() => ''); if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) errors.push(`Private key material found: ${path}`);
  }
}
if (errors.length) throw new Error(errors.join('\n')); console.log(`Verified ${paths.length} tracked public paths and Git LFS coverage.`);
