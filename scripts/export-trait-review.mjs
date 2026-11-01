import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadReviewImage } from './trait-review-images.mjs';

const base = process.env.TRAIT_REVIEW_URL ?? 'http://127.0.0.1:4273';
const output = resolve('.release/trait-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const sections = [];
const imageIds = new Map();
const embeddedImages = {};
try {
  const references = JSON.parse(await readFile('config/trait-review-references.json', 'utf8')).references;
  const feedback = JSON.parse(await readFile('config/trait-review-feedback.json', 'utf8'));
  const latestCount = Object.values(feedback.latestCorrections).flat().length;
  const coatCount = Object.values(feedback.coatLikeTraits).flat().length;
  const referenceImages = new Map();
  for (const ref of references) {
    const bytes = await loadReviewImage(ref);
    referenceImages.set(ref.imageUrl, `data:image/jpeg;base64,${bytes.toString('base64')}`);
    await page.route(ref.imageUrl, route => route.fulfill({ contentType: 'image/jpeg', body: bytes }));
  }
  await page.goto(`${base}/review.html`);
  const ready = () => page.getByRole('status').filter({ hasText: 'Ready' }).waitFor({ timeout: 120000 });
  await ready();
  if (!(await page.locator('main').textContent()).includes('LOCAL LIBRARY CANDIDATE')) throw new Error('Export requires the local library candidate, not the installed release.');
  for (const species of ['chikn','roostr']) {
    await page.getByLabel('Species', { exact: true }).selectOption(species); await ready();
    await page.getByLabel('Skin', { exact: true }).selectOption(species === 'chikn' ? 'RusticBrown' : 'SnowWhite'); await ready();
    for (const [mode, title] of [['latest','Latest corrections'], ['coats','Coats and breastplates'], ['feedback','Your feedback · V2 visual comparisons'], ['traits','Every trait'], ['outfits','Complete outfits'], ['references','Official V2 visual comparisons']]) {
      await page.getByLabel('Preview set').selectOption(mode); await ready();
      const cards = (await page.locator('.gallery').innerHTML()).replace(/src="([^"]+)"/g, (_, source) => {
        const data = referenceImages.get(source) ?? source;
        let id = imageIds.get(data);
        if (!id) { id = `image-${imageIds.size}`; imageIds.set(data, id); embeddedImages[id] = data; }
        return `data-review-image="${id}"`;
      });
      sections.push(`<h2 id="${species}-${mode}">${species} · ${title}</h2><section class="gallery">${cards}</section>`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const css = await readFile(resolve('apps/showcase/src/trait-review.css'), 'utf8');
  const legal = 'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm.';
  const loadImages = `<script type="application/json" id="review-images">${JSON.stringify(embeddedImages)}</script><script>const images=JSON.parse(document.getElementById('review-images').textContent);for(const image of document.querySelectorAll('img[data-review-image]'))image.src=images[image.dataset.reviewImage];</script>`;
  await writeFile(resolve(output,'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trait assembly candidate · owner review</title><style>${css}</style><main><h1>Chikn + Roostr V2 · assembly candidate</h1><p>${latestCount} latest corrections, ${coatCount} coat-like outfits, the earlier 95-trait feedback set, all 276 trait groups, 108 complete outfits and ${references.length} V2 visual references. Owner authorized library release with the general coat-leg correction on 1 November 2026. All preview and reference images are embedded for offline review.</p><p><a href="#chikn-latest">Latest Chikn</a> · <a href="#roostr-latest">Latest Roostr</a> · <a href="#chikn-coats">Chikn coats</a> · <a href="#roostr-coats">Roostr coats</a> · <a href="#chikn-feedback">Chikn feedback</a> · <a href="#roostr-feedback">Roostr feedback</a> · <a href="#chikn-traits">Chikn traits</a> · <a href="#roostr-traits">Roostr traits</a> · <a href="#chikn-outfits">Chikn outfits</a> · <a href="#roostr-outfits">Roostr outfits</a> · <a href="#chikn-references">Chikn V2 visuals</a> · <a href="#roostr-references">Roostr V2 visuals</a></p><p>Layer policy: held props stay behind the front wing; coat-like garments and breastplates cover it and the leg branches. Placement references: Chikn V2 build1 and Roostr V2 build3, as used in Roost Rift. Matched V2 visual references cover 273 of 276 groups and all 19 base skins. Polygon Bling, Polygon Degen and Roostr MFD have no matching live label. Roostr chains and Chikn fringes reuse cropped official artwork already in the pack; source images and rights records are unchanged.</p>${sections.join('\n')}<p>${legal}</p></main>${loadImages}</html>`);
  console.log(`Exported ${resolve(output,'index.html')}`);
} finally { await browser.close(); }
