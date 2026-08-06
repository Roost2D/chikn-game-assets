import assert from 'node:assert/strict';
import test from 'node:test';
import { portablePathError, assertPortableRelativePath, validateManifest } from '../manifest-utils.mjs';

const REJECTED = [
  ['uppercase scheme', 'HTTPS://evil.example/x.png'],
  ['lowercase scheme', 'https://evil.example/x.png'],
  ['protocol relative', '//evil.example/x.png'],
  ['posix absolute', '/etc/passwd'],
  ['windows drive', 'C:/Windows/win.ini'],
  ['file scheme', 'file:///etc/passwd'],
  ['backslash traversal', String.raw`..\..\x.png`],
  ['unc path', String.raw`\\unc\share\x.png`],
  ['parent traversal', '../../x.png'],
  ['embedded traversal', 'runtime/../../etc/passwd'],
  ['encoded traversal', '%2e%2e%2fx.png'],
  ['encoded separator', 'runtime/%2E%2E/x.png'],
  ['empty segment', 'runtime//x.png'],
  ['dot segment', 'runtime/./x.png'],
  ['empty string', ''],
];

test('portable path validation rejects every escape form', () => {
  for (const [label, path] of REJECTED) {
    assert.ok(portablePathError(path, { prefix: 'runtime/' }), `${label} (${path}) must be rejected`);
  }
});

test('portable path validation rejects control characters', () => {
  const nul = `runtime/a${String.fromCharCode(0)}.png`;
  const del = `runtime/a${String.fromCharCode(127)}.png`;
  assert.match(portablePathError(nul), /control characters/);
  assert.match(portablePathError(del), /control characters/);
});

test('portable path validation accepts real runtime paths', () => {
  assert.equal(portablePathError('runtime/atlases/default/chikn-flat-001.png', { prefix: 'runtime/' }), null);
  assert.equal(portablePathError('sources/traits-chikn/Head/Goose.png', { prefix: 'sources/' }), null);
});

test('the prefix requirement is enforced', () => {
  assert.match(portablePathError('sources/a.png', { prefix: 'runtime/' }), /must start with runtime\//);
  assert.equal(portablePathError('sources/a.png', { prefix: 'sources/' }), null);
});

test('assertPortableRelativePath throws with the offending path', () => {
  assert.throws(() => assertPortableRelativePath('../x', { prefix: 'sources/' }), /\.\.\/x: path must not contain relative segments/);
  assert.equal(assertPortableRelativePath('sources/a.png', { prefix: 'sources/' }), 'sources/a.png');
});

test('manifest validation rejects off-origin variant paths', () => {
  const manifest = {
    schema: 'roost2d.assets/v1',
    rightsDocumentSha256: 'a'.repeat(64),
    files: [{
      id: 'example',
      mediaType: 'image/png',
      variants: [{ profile: 'default', path: 'HTTPS://evil.example/x.png', bytes: 1, integrity: { algorithm: 'sha256', value: `sha256-${'A'.repeat(43)}=` }, scale: 1 }],
    }],
    bundles: [],
  };
  assert.ok(validateManifest(manifest).some((error) => error.includes('URL scheme')));
});

test('manifest validation accepts a well-formed runtime variant', () => {
  const manifest = {
    schema: 'roost2d.assets/v1',
    rightsDocumentSha256: 'a'.repeat(64),
    files: [{
      id: 'example',
      mediaType: 'image/png',
      variants: [{ profile: 'default', path: 'runtime/atlases/default/a.png', bytes: 1, integrity: { algorithm: 'sha256', value: `sha256-${'A'.repeat(43)}=` }, scale: 1 }],
    }],
    bundles: [],
  };
  assert.deepEqual(validateManifest(manifest), []);
});
