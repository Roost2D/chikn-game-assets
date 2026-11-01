import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { loadReviewImage } from './trait-review-images.mjs';
const refs = JSON.parse(await readFile('config/trait-review-references.json', 'utf8')).references;
const feedback = JSON.parse(await readFile('config/trait-review-feedback.json', 'utf8'));
const out = '.release/trait-review/feedback'; await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const species of ['chikn','roostr']) for (const [category,names] of Object.entries(feedback[species])) {
    const cards = [];
    for (const name of names) {
      const id = `${category}/${name}`;
      const ref = refs.find(ref => ref.species === species && ref.traitGroupIds.includes(id));
      if (!ref) { cards.push(`<article><h2>${id}</h2><p>No live V2 match</p></article>`); continue; }
      const bytes = await loadReviewImage(ref);
      cards.push(`<article><h2>${id} · #${ref.token}</h2><img src="data:image/jpeg;base64,${bytes.toString('base64')}"></article>`);
    }
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    await page.setContent(`<style>body{margin:0;background:#191b20;color:white;font:12px sans-serif}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}article{padding:4px}h2{font-size:13px;margin:0 0 4px}img{width:100%}</style><div class="grid">${cards.join('')}</div>`);
    await page.screenshot({ path: `${out}/v2-${species}-${category}.png`, fullPage: true });
    await page.close(); console.log(`${species}/${category}: ${names.length} references`);
  }
} finally { await browser.close(); }
