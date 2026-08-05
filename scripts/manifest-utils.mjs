import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const SRI_SHA256 = /^sha256-[A-Za-z0-9+/]{43}=$/;
export function sha256SRI(bytes) { return `sha256-${createHash('sha256').update(bytes).digest('base64')}`; }

export function validateManifest(manifest) {
  const errors = [];
  if (manifest.schema !== 'roost2d.assets/v1') errors.push('schema must be roost2d.assets/v1');
  if (!/^[a-f0-9]{64}$/i.test(manifest.rightsDocumentSha256 ?? '')) errors.push('rightsDocumentSha256 must be a SHA-256 hex digest');
  const ids = new Set();
  for (const file of manifest.files ?? []) {
    if (!file.id || ids.has(file.id)) errors.push(`duplicate or empty asset id: ${file.id}`);
    ids.add(file.id);
    for (const alias of file.aliases ?? []) { if (!alias || ids.has(alias)) errors.push(`duplicate or empty asset alias: ${alias}`); ids.add(alias); }
    if (!file.variants?.length) errors.push(`${file.id}: requires one or more variants`);
    for (const variant of file.variants ?? []) {
      if (!SRI_SHA256.test(variant.integrity?.value ?? '')) errors.push(`${file.id}: invalid SHA-256 SRI value`);
      if (!Number.isInteger(variant.bytes) || variant.bytes < 0) errors.push(`${file.id}: invalid byte count`);
      if (!variant.path || /^(?:https?:)?\/\//.test(variant.path)) errors.push(`${file.id}: paths must be relative`);
    }
  }
  for (const bundle of manifest.bundles ?? []) for (const item of bundle.items ?? []) {
    if (!ids.has(item.assetId)) errors.push(`${bundle.id}: unknown asset ${item.assetId}`);
    if (item.fallbackAssetId && !ids.has(item.fallbackAssetId)) errors.push(`${bundle.id}: unknown fallback ${item.fallbackAssetId}`);
  }
  return errors;
}

export async function verifyManifestFiles(manifest, assetRoot) {
  const errors = validateManifest(manifest);
  const root = resolve(assetRoot);
  for (const file of manifest.files ?? []) for (const variant of file.variants ?? []) {
    const absolute = resolve(root, variant.path);
    if (!absolute.startsWith(root + sep)) { errors.push(`${file.id}: path escapes asset root`); continue; }
    try {
      const [bytes, info] = await Promise.all([readFile(absolute), stat(absolute)]);
      if (info.size !== variant.bytes) errors.push(`${file.id}: expected ${variant.bytes} bytes, got ${info.size}`);
      if (sha256SRI(bytes) !== variant.integrity.value) errors.push(`${file.id}: SHA-256 integrity mismatch`);
    } catch { errors.push(`${file.id}: missing ${variant.path}`); }
  }
  return errors;
}
