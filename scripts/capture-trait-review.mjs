import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('.release/trait-review', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://127.0.0.1:4273/review.html');
const ready = () => page.getByRole('status').filter({ hasText: 'Ready' }).waitFor({ timeout: 120000 });
await ready();
await page.addStyleTag({ content: 'form{position:static}.gallery{grid-template-columns:repeat(8,1fr);gap:4px}article{padding:4px}h2{font-size:11px}article p,article details,article a{display:none}main{max-width:none}' });
const prefix = process.argv[2] ?? 'baseline';
for (const species of ['chikn','roostr']) {
  await page.getByLabel('Species', { exact: true }).selectOption(species); await ready();
  // Use a plain skin so overlays and missing parts are easy to inspect.
  await page.getByLabel('Skin', { exact: true }).selectOption(species === 'chikn' ? 'RusticBrown' : 'SnowWhite'); await ready();
  for (const category of ['Feet','Head','Neck','Torso','Tail']) {
    await page.getByLabel('Category', { exact: true }).selectOption(category); await ready();
    await page.locator('.gallery').screenshot({ path: `.release/trait-review/${prefix}-${species}-${category}.png` });
  }
}
await writeFile(`.release/trait-review/${prefix}-errors.json`, JSON.stringify(errors));
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
