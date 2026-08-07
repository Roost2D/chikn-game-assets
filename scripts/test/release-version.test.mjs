import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRcReleaseVersion } from '../release-version.mjs';

test('accepts matching release candidate versions without pinning a specific RC', () => {
  assert.equal(assertRcReleaseVersion('0.1.0-rc.5', '0.1.0-rc.5'), '0.1.0-rc.5');
  assert.equal(assertRcReleaseVersion('2.3.4-rc.17', '2.3.4-rc.17'), '2.3.4-rc.17');
});

test('rejects stable, malformed, and mismatched release versions', () => {
  assert.throws(() => assertRcReleaseVersion('0.1.0', '0.1.0'), /unexpected release version/);
  assert.throws(() => assertRcReleaseVersion('0.1.0-rc.5', '0.1.0-rc.4'), /versions must match/);
  assert.throws(() => assertRcReleaseVersion('v0.1.0-rc.5', 'v0.1.0-rc.5'), /unexpected release version/);
});
