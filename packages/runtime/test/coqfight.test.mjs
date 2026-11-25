import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { composeCoqfightDefinition, loadChiknPack, loadCoqfightCatalog, loadCoqfightCharacter, normalizeCoqfightRecipe } from '../dist/index.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const baseRecipe = { schema: 'chikn.coqfight-character/v1', setId: 'coqfight-v1', species: 'chikn', bodySkinId: 'Bullion', traitSkinIds: [], animationName: 'Idle' };
const makeFixture = async (corrupt = false) => {
  const calls = [];
  const fetcher = async (input) => {
    const url = new URL(input); assert.equal(url.origin, 'https://fixture.invalid');
    calls.push(url.pathname);
    const bytes = await readFile(resolve(root, url.pathname.replace(/^\/pack\//, '')));
    return new Response(corrupt && url.pathname.endsWith('/rig.json') ? Buffer.from('tampered') : bytes);
  };
  const pack = await loadChiknPack({ baseUrl: 'https://fixture.invalid/pack/', fetch: fetcher });
  return { pack, fetch: fetcher, calls };
};

test('pinned official catalog and both native species preserve all latest clips and source loop provenance', async () => {
  const fixture = await makeFixture();
  const catalog = await loadCoqfightCatalog(fixture);
  assert.equal(catalog.animationNames.length, 41);
  for (const species of ['chikn', 'roostr']) {
    const raw = await readJson(`sources/coqfight-v1/${species}/${species}.json`);
    assert.deepEqual(new Set(catalog.animationNames), new Set(Object.keys(raw.animations)));
    assert.equal(catalog.species[species].bodySkinIds.length, 21);
    assert.equal(catalog.species[species].traitSkinIds.length, species === 'chikn' ? 174 : 224);
    const character = await loadCoqfightCharacter({ ...fixture, recipe: { ...baseRecipe, species } });
    assert.equal(character.clips.length, 41);
    assert.equal(character.definition.bones.length, 69);
    assert.equal(character.definition.slots.length, 66);
    assert.deepEqual(Object.keys(character.definition.attachmentNames).sort(), ['default', 'selected']);
    assert.ok(character.assetIds.length < 30, 'selected body must not load the whole corpus');
    const clip = (name) => character.clips.find(({ id }) => id === `coqfight-v1.${species}.${name}`);
    assert.equal(clip('Death').loop, false);
    assert.equal(character.metadata.animationMeta.Death.loop, true);
    for (const name of ['Idle', 'IdleHurt', 'Walk', 'Run', 'Victory', 'Flap']) assert.equal(clip(name).loop, true);
    for (const name of ['Jump', 'Peck', 'Hop']) assert.equal(clip(name).loop, false);
    assert.equal(character.metadata.animationMeta.Walk.generated, true);
  }
});

test('selected rigs keep named default swaps and hide replaced base slots throughout all animations', async () => {
  const source = await readJson('runtime/coqfight-v1/chikn/rig.json');
  const rules = await readJson('runtime/coqfight-v1/trait-rules.json');
  const trait = Object.keys(source.attachmentNames).find((id) => id.startsWith('trait/') && source.attachmentNames[id]['Tail.Special']);
  assert.ok(trait);
  const definition = composeCoqfightDefinition(source, { ...baseRecipe, traitSkinIds: [trait] }, rules);
  assert.equal(definition.attachmentNames.selected.Tail, undefined);
  assert.equal(definition.attachmentNames.default.Tail, undefined);
  const swapId = definition.attachmentNames.default['Front.Forehand.Back']['swap/Front.Forehand.Back'];
  assert.ok(definition.attachments.some(({ id }) => id === swapId));
  assert.ok(definition.attachments.every(({ id }) => !id.includes('/Celestial/')));
});

test('a later overlapping trait removes the entire earlier multi-slot trait and returns normalized recipe', async () => {
  const source = await readJson('runtime/coqfight-v1/chikn/rig.json');
  const traits = Object.entries(source.attachmentNames).filter(([id]) => id.startsWith('trait/'));
  const first = traits.find(([, table]) => Object.keys(table).length > 1 && traits.some(([id, other]) => other !== table && Object.keys(other).some((slot) => slot in table)));
  assert.ok(first);
  const second = traits.find(([id, table]) => id !== first[0] && Object.keys(table).some((slot) => slot in first[1]));
  const input = { ...baseRecipe, traitSkinIds: [first[0], second[0]] };
  assert.deepEqual(normalizeCoqfightRecipe(source, input).traitSkinIds, [second[0]]);
  const fixture = await makeFixture();
  const character = await loadCoqfightCharacter({ ...fixture, recipe: input });
  assert.deepEqual(character.recipe.traitSkinIds, [second[0]]);
  assert.deepEqual(input.traitSkinIds, [first[0], second[0]], 'normalization must not mutate caller state');
});

test('metadata verification is cached by immutable URL and integrity; failures remain retryable', async () => {
  const fixture = await makeFixture();
  await loadCoqfightCharacter({ ...fixture, recipe: baseRecipe });
  const metadataCalls = fixture.calls.length;
  await loadCoqfightCharacter({ ...fixture, recipe: { ...baseRecipe, animationName: 'Punch' } });
  assert.equal(fixture.calls.length, metadataCalls, 'changing a clip must not redownload rig metadata');
  const corrupt = await makeFixture(true);
  await assert.rejects(loadCoqfightCharacter({ ...corrupt, recipe: baseRecipe }), /expected .* bytes|SHA-256/);
  await assert.rejects(loadCoqfightCharacter({ ...fixture, recipe: { ...baseRecipe, species: 'unknown' } }), /Invalid Coqfight recipe/);
  await assert.rejects(loadCoqfightCharacter({ ...fixture, recipe: { ...baseRecipe, bodySkinId: 'missing' } }), /Unknown Coqfight body/);
  await assert.rejects(loadCoqfightCharacter({ ...fixture, recipe: { ...baseRecipe, traitSkinIds: ['trait/roostr_crown'] } }), /Unknown chikn Coqfight trait/);
  await assert.rejects(loadCoqfightCharacter({ ...fixture, recipe: { ...baseRecipe, animationName: 'missing' } }), /Unknown Coqfight animation/);
});

test('official snapshot metadata retains upstream licence and immutable byte provenance', async () => {
  const lock = await readJson('config/coqfight-v1.lock.json');
  const rights = await readJson('manifests/rights-manifest.json');
  assert.ok(lock.snapshotCutoffUtc);
  for (const doc of lock.documents) {
    const bytes = await readFile(resolve(root, doc.sourcePath));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), doc.sha256);
    const record = rights.assets.find(({ sourcePath }) => sourcePath === doc.sourcePath);
    assert.equal(record.license, 'CHIKN-COMMUNITY-NONCOMMERCIAL');
    assert.equal(record.sublicenseGrantedByRepository, false);
    assert.equal(record.licenseDocument, 'sources/coqfight-v1/LICENSE.md');
  }
});

test('aborting the first route leaves a concurrent metadata subscriber live', async () => {
  let releaseRig;
  const delayed = new Promise((resolve) => { releaseRig = resolve; });
  let enteredRig;
  const entered = new Promise((resolve) => { enteredRig = resolve; });
  const fetcher = async (input, options) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/rig.json')) { assert.equal(options?.signal, undefined); enteredRig(); await delayed; }
    return new Response(await readFile(resolve(root, url.pathname.replace(/^\/pack\//, ''))));
  };
  const pack = await loadChiknPack({ baseUrl: 'https://fixture.invalid/pack/', fetch: fetcher });
  const controller = new AbortController();
  const first = loadCoqfightCharacter({ pack, recipe: baseRecipe, fetch: fetcher, signal: controller.signal });
  await entered;
  const second = loadCoqfightCharacter({ pack, recipe: baseRecipe, fetch: fetcher });
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  releaseRig();
  assert.equal((await second).clips.length, 41);
});
