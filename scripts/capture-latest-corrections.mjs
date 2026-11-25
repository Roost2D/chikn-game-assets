import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadReviewImage } from './trait-review-images.mjs';
const out='.release/trait-review';
const feedback=JSON.parse(await readFile('config/trait-review-feedback.json','utf8'));
const refs=JSON.parse(await readFile('config/trait-review-references.json','utf8')).references;
const beforeOnly=process.argv.includes('--before');
await mkdir(`${out}/latest-before`,{recursive:true});
const browser=await chromium.launch();const cards=[];const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',error=>errors.push(error.message));
 const ready=()=>page.getByRole('status').filter({hasText:'Ready'}).waitFor({timeout:120000});
 for(const species of ['chikn','roostr'])for(const id of feedback.latestCorrections[species]){
  const ref=refs.find(ref=>ref.species===species&&ref.traitGroupIds.includes(id));if(!ref)throw new Error(`No V2 reference: ${species}/${id}`);
  const path=`${out}/latest-before/${species}-${id.replace('/','-')}.png`;
  await page.goto(`http://127.0.0.1:4273/review.html?species=${species}&trait=${beforeOnly?ref.token:id}&review=${beforeOnly?'feedback':'latest'}`);await ready();
  if(beforeOnly){
   await page.getByLabel('Preview set').selectOption('references');await ready();
   const image=await page.locator(`article[data-id="${species}/${ref.token}"] img`).first().getAttribute('src');await writeFile(path,Buffer.from(image.split(',')[1],'base64'));continue;
  }
  const before=await readFile(path);cards.push(`<article><h2>${species}/${id} · previous candidate</h2><img src="data:image/png;base64,${before.toString('base64')}"></article>`);
  for(const facing of ['right','left']){
   await page.getByLabel('Facing',{exact:true}).selectOption(facing);await ready();
   const image=await page.locator(`article[data-id="${id}"] img`).first().getAttribute('src');cards.push(`<article><h2>Updated · ${facing}</h2><img src="${image}"></article>`);
  }
  const image=await loadReviewImage(ref);cards.push(`<article><h2>${ref.artBuild} · #${ref.token}</h2><img src="data:image/jpeg;base64,${image.toString('base64')}"></article>`);
 }
 if(beforeOnly){console.log('Saved six previous candidate previews.');}
 else{
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Latest V2 trait corrections</title><style>body{margin:0;padding:12px;background:#191b20;color:#eee;font:14px system-ui}main{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}article{background:#24272d;padding:8px}h2{font-size:13px}img{width:100%;height:300px;object-fit:contain}</style><h1>Latest V2 corrections · 1 November</h1><p>Coats and breastplates cover the front wing and leg branches. Held props stay beneath it. Owner authorized library release with the general coat-leg correction on 1 November 2026.</p><main>${cards.join('')}</main></html>`;
  await writeFile(`${out}/latest-corrections.html`,html);await page.setContent(html);await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));await page.screenshot({path:`${out}/latest-corrections.png`,fullPage:true});
  console.log('Saved six updated comparisons, both facings and V2 sources.');
 }
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}
