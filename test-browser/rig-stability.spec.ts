import { readFile, stat } from 'node:fs/promises';
import { expect, test, type Download, type Page } from '@playwright/test';

const readyText = '"applicationCompensation": "none"';

async function waitForRig(page: Page) {
  const status = page.locator('#app .panel pre.config');
  await expect(status).toContainText(readyText);
  await expect(page.locator('#app canvas')).toBeVisible();
}

test('the production rig path survives pooled-style reconfiguration on desktop and mobile engines', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));

  await page.goto('/#rig');
  await waitForRig(page);

  const species = page.getByLabel('Species');
  const profile = page.getByLabel('Asset profile');
  const category = page.getByLabel('Trait slot');
  const trait = page.getByLabel('Trait', { exact: true });

  for (const value of ['roostr', 'chikn']) {
    await species.selectOption(value);
    await waitForRig(page);
    await category.selectOption('Head');
    await expect.poll(() => trait.locator('option').count()).toBeGreaterThan(1);
    await trait.selectOption({ index: 1 });
    await waitForRig(page);
    await trait.selectOption('');
    await waitForRig(page);
  }

  await profile.selectOption('high');
  await waitForRig(page);
  await profile.selectOption('default');
  await waitForRig(page);

  await page.evaluate(() => { location.hash = '#showcase'; });
  await expect(page.getByRole('heading', { name: 'The Chikn community asset shelf.' })).toBeVisible();
  await page.evaluate(() => { location.hash = '#rig'; });
  await waitForRig(page);

  expect(pageErrors).toEqual([]);
});

test('the recipe builder composes multiple traits, hides replaced feathers, and exports the same animated bird', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await page.goto('/#builder');
  const status = page.locator('#app .panel pre.config');
  await expect(status).toContainText('roost2d.chikn-character/v1');

  await page.getByLabel('Builder species').selectOption('roostr');
  await expect(status).toContainText('"species": "roostr"');
  await page.getByLabel('Builder skin').selectOption('MutantPurple');
  await page.getByLabel('Head trait').selectOption('head/robocoq');
  await page.getByLabel('Feet trait').selectOption('feet/golden-greaves');
  await page.getByLabel('Tail trait').selectOption('tail/foliage');
  await expect(status).toContainText('Trait_Tail_Foliage');

  const state = JSON.parse(await status.textContent() ?? '{}');
  expect(state.replacementSlots).toEqual(expect.arrayContaining(['Head', 'LegFoot A', 'LegFoot B', 'Tail']));
  expect(state.activeAttachments).toEqual(expect.arrayContaining([
    'Trait_Head_Robocoq',
    'Trait_Feet_GoldenGreaves_A',
    'Trait_Feet_GoldenGreaves_B',
    'Trait_Tail_Foliage',
  ]));
  expect(state.activeAttachments).not.toEqual(expect.arrayContaining([
    'MutantPurple_Head',
    'MutantPurple_LegFootA',
    'MutantPurple_LegFootB',
    'MutantPurple_Tail',
  ]));
  await expect(page.locator('#app canvas')).toBeVisible();

  const downloads: Download[] = [];
  page.on('download', (download) => downloads.push(download));
  await page.getByRole('button', { name: 'Export animation sheet' }).click();
  await expect.poll(() => downloads.length).toBe(1);
  await page.getByRole('button', { name: 'Export animation JSON' }).click();
  await expect.poll(() => downloads.length).toBe(2);
  const png = downloads.find((download) => download.suggestedFilename().endsWith('.png'));
  const json = downloads.find((download) => download.suggestedFilename().endsWith('.json'));
  expect(png).toBeDefined();
  expect(json).toBeDefined();
  const pngPath = await png?.path();
  const jsonPath = await json?.path();
  expect(pngPath).toBeTruthy();
  expect(jsonPath).toBeTruthy();
  expect((await stat(pngPath!)).size).toBeGreaterThan(1_000);
  const sheet = JSON.parse(await readFile(jsonPath!, 'utf8'));
  expect(sheet).toMatchObject({ schema: 'roost2d.sprite-sheet/v1', frameCount: 12, columns: 4, rows: 3 });
  expect(sheet.recipe).toMatchObject({
    schema: state.schema,
    species: state.species,
    skinId: state.skinId,
    traitGroupIds: state.traitGroupIds,
    animationId: state.animationId,
  });
  await png?.saveAs(testInfo.outputPath('builder-animation-sheet.png'));
  expect(pageErrors).toEqual([]);
});
