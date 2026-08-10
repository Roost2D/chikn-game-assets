import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReleaseVersion } from '../release-version.mjs';

test('accepts matching stable and release candidate versions', () => {
  assert.equal(assertReleaseVersion('0.1.0', '0.1.0'), '0.1.0');
  assert.equal(assertReleaseVersion('0.1.0-rc.5', '0.1.0-rc.5'), '0.1.0-rc.5');
  assert.equal(assertReleaseVersion('2.3.4-rc.17', '2.3.4-rc.17'), '2.3.4-rc.17');
});

test('rejects unsupported prereleases, malformed versions, and mismatches', () => {
  assert.throws(() => assertReleaseVersion('0.1.0-beta.1', '0.1.0-beta.1'), /unexpected release version/);
  assert.throws(() => assertReleaseVersion('01.1.0', '01.1.0'), /unexpected release version/);
  assert.throws(() => assertReleaseVersion('0.1.0-rc.01', '0.1.0-rc.01'), /unexpected release version/);
  assert.throws(() => assertReleaseVersion('0.1.0-rc.5', '0.1.0-rc.4'), /versions must match/);
  assert.throws(() => assertReleaseVersion('v0.1.0-rc.5', 'v0.1.0-rc.5'), /unexpected release version/);
});
