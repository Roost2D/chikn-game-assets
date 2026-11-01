import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { loadReviewImage } from './trait-review-images.mjs';
const out='.release/trait-review';
const refs=JSON.parse(await readFile('config/trait-review-references.json','utf8')).references;
const browser=await chromium.launch();
const cards=[];
try {
  const page=await browser.newPage({viewport:{width:1600,height:1000}});
  const ready=()=>page.getByRole('status').filter({hasText:'Ready'}).waitFor({timeout:120000});
  for(const[species,id]of[['chikn','torso/cutlass'],['roostr','head/samurai']]){
    await page.goto(`http://127.0.0.1:4273/review.html?review=feedback&species=${species}&trait=${id}`);await ready();
    const before=await readFile(`${out}/v2-before-${species}.png`);
    cards.push(`<article><h2>${species}/${id} · previous candidate</h2><img src="data:image/png;base64,${before.toString('base64')}"></article>`);
    for(const facing of ['right','left']){
      await page.getByLabel('Facing',{exact:true}).selectOption(facing);await ready();
      const image=await page.locator(`article[data-id="${id}"] img`).first().getAttribute('src');
      cards.push(`<article><h2>Corrected candidate · ${facing}</h2><img src="${image}"></article>`);
    }
    const reference=refs.find(ref=>ref.species===species&&ref.traitGroupIds.includes(id));
    const image=await loadReviewImage(reference);
    cards.push(`<article><h2>${reference.artBuild} · #${reference.token}</h2><img src="data:image/jpeg;base64,${image.toString('base64')}"></article>`);
  }
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Cutlass + Samurai V2 corrections</title><style>body{margin:0;padding:12px;background:#191b20;color:#eee;font:14px system-ui}main{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}article{background:#24272d;padding:8px}h2{font-size:13px}img{width:100%;height:330px;object-fit:contain}</style><h1>Cutlass + Samurai · V2 review</h1><p>Listed torso props stay behind the front wing. Owner approval pending.</p><main>${cards.join('')}</main></html>`;
  await writeFile(`${out}/v2-corrections.html`,html);
  await page.setContent(html);
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:`${out}/v2-corrections.png`,fullPage:true});
} finally { await browser.close(); }
