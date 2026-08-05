import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { RouteLifecycle } from '../src/lifecycle.ts';

test('the initial render starts after module-scoped templates initialize', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const templatesReady = source.indexOf('const RIGHTS_ROWS');
  const initialRender = source.lastIndexOf('void render();');
  assert.ok(templatesReady >= 0 && initialRender > templatesReady, 'startup must not render through constants still in the temporal dead zone');
});

test('beginning a route tears down the previous one', () => {
  const lifecycle = new RouteLifecycle();
  const disposed: string[] = [];
  const first = lifecycle.begin();
  first.onTeardown(() => disposed.push('first'));

  assert.deepEqual(disposed, []);
  lifecycle.begin();
  assert.deepEqual(disposed, ['first']);
});

test('teardown runs disposers in reverse registration order', () => {
  const lifecycle = new RouteLifecycle();
  const disposed: string[] = [];
  const session = lifecycle.begin();
  session.onTeardown(() => disposed.push('app'));
  session.onTeardown(() => disposed.push('listeners'));

  lifecycle.end();
  assert.deepEqual(disposed, ['listeners', 'app']);
});

test('teardown is idempotent', () => {
  const lifecycle = new RouteLifecycle();
  const disposed: string[] = [];
  const session = lifecycle.begin();
  session.onTeardown(() => disposed.push('once'));

  lifecycle.end();
  lifecycle.end();
  lifecycle.end();
  assert.deepEqual(disposed, ['once']);
});

test('the abort signal fires on teardown', () => {
  const lifecycle = new RouteLifecycle();
  const session = lifecycle.begin();
  assert.equal(session.signal.aborted, false);
  lifecycle.end();
  assert.equal(session.signal.aborted, true);
});

test('a session becomes stale once a newer route begins', () => {
  const lifecycle = new RouteLifecycle();
  const first = lifecycle.begin();
  assert.equal(first.isStale, false);
  const second = lifecycle.begin();
  assert.equal(first.isStale, true);
  assert.equal(second.isStale, false);
});

// The regression this whole mechanism exists for: an async route that resolves after navigation.
test('a stale route disposes resources immediately instead of installing them', () => {
  const lifecycle = new RouteLifecycle();
  const destroyed: string[] = [];
  const slowRoute = lifecycle.begin();

  lifecycle.begin(); // user navigates away while the slow route is still awaiting

  slowRoute.onTeardown(() => destroyed.push('late-application'));
  assert.deepEqual(destroyed, ['late-application'], 'a late resource must be destroyed on arrival');
});

test('a stale resource is not disposed twice by a later teardown', () => {
  const lifecycle = new RouteLifecycle();
  const destroyed: string[] = [];
  const slowRoute = lifecycle.begin();
  lifecycle.begin();
  slowRoute.onTeardown(() => destroyed.push('late'));

  lifecycle.end();
  assert.deepEqual(destroyed, ['late']);
});

test('a throwing disposer does not block the others', () => {
  const lifecycle = new RouteLifecycle();
  const disposed: string[] = [];
  const session = lifecycle.begin();
  session.onTeardown(() => disposed.push('first'));
  session.onTeardown(() => { throw new Error('boom'); });
  session.onTeardown(() => disposed.push('third'));

  assert.doesNotThrow(() => lifecycle.end());
  assert.deepEqual(disposed, ['third', 'first']);
});
