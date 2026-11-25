import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const V2_ART_BUILDS = { chikn: 'chiknV2/build1', roostr: 'roostrV2/build3' };
export function assertV2Reference(reference) {
  const build = V2_ART_BUILDS[reference.species];
  const prefix = `https://chikn-farm.sfo3.cdn.digitaloceanspaces.com/${build}/image/`;
  if (!build || !Number.isSafeInteger(reference.token) || reference.token < 0 || !/^[a-f0-9]+\.jpe?g$/i.test(reference.filename ?? '') || reference.artBuild !== build || reference.imageUrl !== `${prefix}${reference.filename}`) throw new Error(`Review requires the Roost Rift V2 visual: ${reference.species}/${reference.token}`);
}

export async function loadReviewImage(reference) {
  assertV2Reference(reference);
  // Versioned cache prevents a legacy render with the same token from being reused.
  const folder = resolve('.release/trait-review/feedback/v2');
  const path = resolve(folder, `${reference.species}-${reference.token}.jpg`);
  let bytes = await readFile(path).catch(() => undefined);
  if (!bytes) {
    const response = await fetch(reference.imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`V2 visual ${reference.species}/${reference.token}: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(folder, { recursive: true });
    await writeFile(path, bytes);
  }
  return bytes;
}
