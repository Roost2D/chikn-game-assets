import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertV2Reference } from '../trait-review-images.mjs';

test('review references use only the Chikn/Roostr V2 visual builds used by Roost Rift', async () => {
  const review = JSON.parse(await readFile(new URL('../../config/trait-review-references.json', import.meta.url), 'utf8'));
  assert.equal(review.referenceKind, 'v2-visuals');
  assert.equal(review.references.length, 107);
  for (const reference of review.references) {
    assertV2Reference(reference);
    assert.equal(reference.referenceUrl, reference.imageUrl);
    assert.equal(reference.nftUrl, undefined);
    assert.equal(reference.metadataUrl, undefined, 'the legacy metadata.image URL is not used');
  }
  assert.throws(() => assertV2Reference({ species: 'roostr', token: 10406, artBuild: 'roostrV2/build3', imageUrl: 'https://chikn-farm.sfo3.cdn.digitaloceanspaces.com/roostr/build30/image/legacy.jpeg' }), /V2 visual/);
});

test('latest corrections and coats have V2 counterparts and do not contradict the held-prop layer rule', async () => {
  const review = JSON.parse(await readFile(new URL('../../config/trait-review-references.json', import.meta.url), 'utf8'));
  const feedback = JSON.parse(await readFile(new URL('../../config/trait-review-feedback.json', import.meta.url), 'utf8'));
  for (const species of ['chikn','roostr']) {
    for (const id of [...feedback.latestCorrections[species], ...feedback.coatLikeTraits[species]]) assert.ok(review.references.some(ref => ref.species === species && ref.traitGroupIds.includes(id)), `${species}/${id}`);
    for (const coat of feedback.coatLikeTraits[species]) assert.ok(!feedback.behindFrontWing[species].includes(coat), `${coat}: coat must cover the wing`);
  }
});
