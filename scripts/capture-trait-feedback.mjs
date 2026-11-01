import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadReviewImage } from './trait-review-images.mjs';
const base = process.env.TRAIT_REVIEW_URL ?? 'http://127.0.0.1:4273';
const output = '.release/trait-review/feedback';
await mkdir(output, { recursive: true });
const feedback = JSON.parse(await readFile('config/trait-review-feedback.json', 'utf8'));
const references = JSON.parse(await readFile('config/trait-review-references.json', 'utf8')).references;
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  // Use only the V2 images; legacy token-named caches cannot satisfy these reads.
  for (const ref of references) {
    const bytes = await loadReviewImage(ref);
    await page.route(ref.imageUrl, route => route.fulfill({ contentType: 'image/jpeg', body: bytes }));
  }
  await page.goto(`${base}/review.html?review=feedback`);
  const ready = () => page.getByRole('status').filter({ hasText: 'Ready' }).waitFor({ timeout: 120000 });
  await ready();
  await page.addStyleTag({ content: 'form{position:static}.gallery{grid-template-columns:repeat(4,1fr);gap:6px}article{padding:5px}h2{font-size:13px}article p,article details,article a{display:none}main{max-width:none}' });
  for (const species of ['chikn','roostr']) {
    await page.getByLabel('Species', { exact: true }).selectOption(species); await ready();
    for (const category of Object.keys(feedback[species])) {
      await page.getByLabel('Category', { exact: true }).selectOption(category[0].toUpperCase() + category.slice(1)); await ready();
      await page.locator('.gallery img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
      await page.locator('.gallery').screenshot({ path: `${output}/comparison-${species}-${category}.png` });
      console.log(`${species}/${category}: matched comparisons captured`);
    }
  }
  await writeFile(`${output}/comparison-errors.json`, JSON.stringify(errors));
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
