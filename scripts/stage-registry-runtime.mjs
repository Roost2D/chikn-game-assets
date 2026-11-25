import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertReleaseVersion } from './release-version.mjs';

/** Registry bytes, not a second platform's repack, own a published npm identity. */
export function verifyRegistryRuntime(metadata, bytes, version) {
  if (metadata?.name !== '@chikn-game-assets/runtime' || metadata.version !== version) throw new Error('Registry runtime identity differs from the release');
  if (!/^sha512-[A-Za-z0-9+/]{86}==$/.test(metadata.dist?.integrity ?? '')) throw new Error('Registry runtime needs SHA-512 integrity');
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  if (integrity !== metadata.dist.integrity) throw new Error('Registry runtime integrity mismatch');
  return integrity;
}

async function main() {
  const root = JSON.parse(await readFile('package.json', 'utf8'));
  const pkg = JSON.parse(await readFile('packages/runtime/package.json', 'utf8'));
  const version = assertReleaseVersion(root.version, pkg.version);
  const directory = resolve('.release', `v${version}`);
  const release = JSON.parse(await readFile(resolve(directory, 'release.json'), 'utf8'));
  if (release.version !== version) throw new Error('Staged release version differs from the package');
  const metadataResponse = await fetch(`https://registry.npmjs.org/@chikn-game-assets%2fruntime/${version}`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!metadataResponse.ok) throw new Error(`Published runtime metadata: HTTP ${metadataResponse.status}`);
  const metadata = await metadataResponse.json();
  const url = new URL(metadata.dist?.tarball);
  if (url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org') throw new Error('Unexpected registry tarball host');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Published runtime tarball: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Runtime helper exceeds the code-only package budget');
  const integrity = verifyRegistryRuntime(metadata, bytes, version);
  const name = `chikn-game-assets-runtime-${version}.tgz`;
  if (!Object.hasOwn(release.artifacts, name)) throw new Error('Release does not contain its runtime helper');
  await writeFile(resolve(directory, name), bytes);
  release.artifacts[name] = createHash('sha256').update(bytes).digest('hex');
  release.npm = { name: metadata.name, version, integrity, tarball: url.href };
  await writeFile(resolve(directory, 'SHA256SUMS'), Object.entries(release.artifacts).map(([file, hash]) => `${hash} *${file}`).join('\n') + '\n');
  await writeFile(resolve(directory, 'release.json'), JSON.stringify(release, null, 2) + '\n');
  console.log(`Staged exact registry helper ${metadata.name}@${version}: ${integrity}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
