import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const feedback = JSON.parse(readFileSync(new URL('../config/trait-review-feedback.json', import.meta.url), 'utf8')) as Record<'chikn' | 'roostr', Record<string, string[]>> & { latestCorrections: Record<'chikn' | 'roostr', string[]>; coatLikeTraits: Record<'chikn' | 'roostr', string[]> };

// DOM traces duplicate hundreds of embedded PNGs and can stall WebKit context
// teardown. The exported gallery and contact sheets provide the visual artifacts.
test.use({ trace: 'off' });

async function ready(page: Page) {
  await expect(page.getByRole('status')).toContainText('Ready');
}

test('assembly review renders every trait, complete outfits, V2 references and mirrored motion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/review.html'); await ready(page);
  for (const [species, count, outfits] of [['chikn', 114, 49], ['roostr', 162, 59]] as const) {
    await page.getByLabel('Species', { exact: true }).selectOption(species); await ready(page);
    await expect(page.locator('.gallery article')).toHaveCount(count + 1);
    expect(await page.locator('.gallery img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.getByLabel('Preview set').selectOption('outfits'); await ready(page);
    await expect(page.locator('.gallery article')).toHaveCount(outfits);
    const recipes = await page.locator('article pre').allTextContents();
    const covered = new Set(recipes.flatMap(recipe => JSON.parse(recipe).traitGroupIds));
    expect(covered.size).toBe(count);
    await page.getByLabel('Preview set').selectOption('references'); await ready(page);
    expect(await page.locator('article a').count()).toBeGreaterThan(40);
    await page.getByLabel('Preview set').selectOption('traits'); await ready(page);
  }
  await page.getByLabel('Category', { exact: true }).selectOption('Feet'); await ready(page);
  for (const profile of ['default','high']) {
    await page.getByLabel('Asset profile', { exact: true }).selectOption(profile); await ready(page);
    for (const pose of ['walk','fly','attack','hit']) {
      await page.getByLabel('Pose', { exact: true }).selectOption(pose); await ready(page);
      await page.getByLabel('Facing', { exact: true }).selectOption('left'); await ready(page);
      await expect(page.locator('.gallery article')).toHaveCount(17);
      await page.getByLabel('Facing', { exact: true }).selectOption('right'); await ready(page);
    }
  }
  expect(errors).toEqual([]);
});

test('candidate assembly keeps coloured Chikn toes and accessory Roostr feet visible on every skin', async ({ page }) => {
  test.skip(!process.env.ROOST2D_REVIEW_ROOT, 'Requires the companion unpublished library candidate');
  await page.goto('/review.html'); await ready(page);
  await expect(page.getByText('LOCAL LIBRARY CANDIDATE · awaiting owner approval')).toBeVisible();
  await page.getByLabel('Category', { exact: true }).selectOption('Feet'); await ready(page);
  for (const species of ['chikn','roostr']) {
    await page.getByLabel('Species', { exact: true }).selectOption(species); await ready(page);
    const skins = await page.getByLabel('Skin', { exact: true }).locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
    for (const skin of skins) {
      await page.getByLabel('Skin', { exact: true }).selectOption(skin); await ready(page);
      if (species === 'chikn') {
        for (const colour of ['purple','red','green','blue']) {
          const value = JSON.parse(await page.locator(`article[data-id="feet/${colour}-feet"] pre`).textContent() ?? '{}');
          expect(value.activeAttachments.filter((id: string) => id.startsWith('Trait_Feet_'))).toHaveLength(4);
          expect(value.activeAttachments).not.toContain(value.baseSlotAttachments['LegLower A']);
        }
      } else {
        for (const id of ['greaves','golden-greaves','spurs','ball-n-chain','ironclaw']) {
          const value = JSON.parse(await page.locator(`article[data-id="feet/${id}"] pre`).textContent() ?? '{}');
          expect(value.activeAttachments).toEqual(expect.arrayContaining([value.baseSlotAttachments['LegFoot A'],value.baseSlotAttachments['LegFoot B']]));
        }
      }
    }
  }
});

test('feedback comparisons cover every reported trait with its complete V2 outfit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/review.html?review=feedback'); await ready(page);
  for (const species of ['chikn','roostr'] as const) {
    await page.getByLabel('Species', { exact: true }).selectOption(species); await ready(page);
    const ids = Object.entries(feedback[species]).flatMap(([category, names]) => names.map(name => `${category}/${name}`));
    await expect(page.locator('.gallery article')).toHaveCount(ids.length);
    for (const id of ids) {
      const card = page.locator(`article[data-id="${id}"]`);
      const recipe = JSON.parse(await card.locator('pre').textContent() ?? '{}');
      expect(recipe.traitGroupIds).toContain(id);
      if (!id.startsWith('neck/polygon-')) {
        const reference = card.getByAltText('Official V2 visual reference');
        await expect(reference).toHaveCount(1);
        expect(await reference.getAttribute('src')).toContain(species === 'chikn' ? '/chiknV2/build1/image/' : '/roostrV2/build3/image/');
      }
      expect(await card.locator('img').first().evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    for (const profile of ['default','high']) {
      await page.getByLabel('Asset profile', { exact: true }).selectOption(profile); await ready(page);
      await page.getByLabel('Pose', { exact: true }).selectOption('attack'); await ready(page);
      await page.getByLabel('Facing', { exact: true }).selectOption('left'); await ready(page);
      await expect(page.locator('.gallery article')).toHaveCount(ids.length);
    }
  }
  expect(errors).toEqual([]);
});

test('latest corrections and all coat-like outfits render in both profiles, facings and motion poses', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/review.html?review=latest'); await ready(page);
  for (const species of ['chikn','roostr'] as const) {
    await page.getByLabel('Species', { exact: true }).selectOption(species); await ready(page);
    for (const [mode, ids] of [['latest',feedback.latestCorrections[species]],['coats',feedback.coatLikeTraits[species]]] as const) {
      await page.getByLabel('Preview set').selectOption(mode); await ready(page);
      await expect(page.locator('.gallery article')).toHaveCount(ids.length);
      for (const id of ids) {
        const card = page.locator(`article[data-id="${id}"]`);
        const recipe = JSON.parse(await card.locator('pre').textContent() ?? '{}');
        expect(recipe.traitGroupIds).toContain(id);
        await expect(card.getByAltText('Official V2 visual reference')).toHaveCount(1);
      }
      for (const profile of ['high','default']) {
        await page.getByLabel('Asset profile', { exact: true }).selectOption(profile); await ready(page);
        for (const [facing,pose] of [['right','walk'],['left','fly'],['left','attack']]) {
          await page.getByLabel('Facing', { exact: true }).selectOption(facing); await ready(page);
          await page.getByLabel('Pose', { exact: true }).selectOption(pose); await ready(page);
          await expect(page.locator('.gallery article')).toHaveCount(ids.length);
          expect(await page.locator('.gallery article .images img:first-child').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
        }
      }
    }
  }
  expect(errors).toEqual([]);
});
