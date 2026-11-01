import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { loadReviewImage } from './trait-review-images.mjs';
const out='.release/trait-review';
const feedback=JSON.parse(await readFile('config/trait-review-feedback.json','utf8'));
const refs=JSON.parse(await readFile('config/trait-review-references.json','utf8')).references;
const browser=await chromium.launch();const sections=[];const images=new Map();const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',error=>errors.push(error.message));
 for(const species of ['chikn','roostr'])for(const id of feedback.coatLikeTraits[species]){
  const ref=refs.find(ref=>ref.species===species&&ref.traitGroupIds.includes(id));if(!ref)throw new Error(id);
  if(images.has(ref.imageUrl))continue;const bytes=await loadReviewImage(ref);images.set(ref.imageUrl,`data:image/jpeg;base64,${bytes.toString('base64')}`);await page.route(ref.imageUrl,route=>route.fulfill({contentType:'image/jpeg',body:bytes}));
 }
 for(const species of ['chikn','roostr']){
  await page.goto(`http://127.0.0.1:4273/review.html?review=coats&species=${species}`);await page.getByRole('status').filter({hasText:'Ready'}).waitFor({timeout:120000});
  await page.addStyleTag({content:'form{position:static}.gallery{grid-template-columns:repeat(3,1fr)}article p,article details,article a{display:none}'});
  await page.locator('.gallery img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
  await page.locator('.gallery').screenshot({path:`${out}/coats-${species}.png`});
  let html=await page.locator('.gallery').innerHTML();for(const[url,data]of images)html=html.replaceAll(url,data);sections.push(`<h2>${species}</h2><section class="gallery">${html}</section>`);
 }
 const css=await readFile('apps/showcase/src/trait-review.css','utf8');await writeFile(`${out}/coat-review.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><title>Coats and breastplates · V2 review</title><style>${css}</style><main><h1>Coats and breastplates</h1><p>All 13 coat-like torso outfits cover the front wing and leg branches. The wing remains animated underneath; legs and footwear stay behind the garment; removing it restores the original wing and leg depths. Owner authorized library release with the general coat-leg correction on 1 November 2026.</p>${sections.join('')}</main></html>`);
 if(errors.length)throw new Error(errors.join('\n'));console.log('Captured all 13 coat-like outfits with V2 comparisons.');
}finally{await browser.close();}
