import { expect, test, type Page } from '@playwright/test';

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
