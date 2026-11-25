import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyRegistryRuntime } from '../stage-registry-runtime.mjs';

test('published artifact identity and SHA-512 must both match before staging', () => {
  const bytes = Buffer.from('immutable npm tarball');
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  const metadata = { name: '@chikn-game-assets/runtime', version: '0.7.0', dist: { integrity } };
  assert.equal(verifyRegistryRuntime(metadata, bytes, '0.7.0'), integrity);
  assert.throws(() => verifyRegistryRuntime(metadata, Buffer.from('other build'), '0.7.0'), /integrity mismatch/);
  assert.throws(() => verifyRegistryRuntime(metadata, bytes, '0.7.0-rc.1'), /identity differs/);
  assert.throws(() => verifyRegistryRuntime({ ...metadata, name: 'unrelated-package' }, bytes, '0.7.0'), /identity differs/);
  assert.throws(() => verifyRegistryRuntime({ ...metadata, dist: {} }, bytes, '0.7.0'), /SHA-512/);
});
