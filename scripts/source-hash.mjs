import { createHash } from 'node:crypto';

const TEXT_SOURCE = /\.(?:json|txt|md|csv|xml|ya?ml)$/i;

/** Git may check text out with platform line endings; rights hashes use canonical UTF-8 LF bytes. */
export function canonicalSourceBytes(bytes, sourcePath) {
  if (!TEXT_SOURCE.test(sourcePath)) return bytes;
  return Buffer.from(bytes.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8');
}

export function sourceSha256(bytes, sourcePath) {
  return createHash('sha256').update(canonicalSourceBytes(bytes, sourcePath)).digest('hex');
}
