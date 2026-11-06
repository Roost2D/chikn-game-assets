import { chromium } from '@playwright/test';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import { loadReviewImage } from './trait-review-images.mjs';

sharp.concurrency(1);
const output='.release/headwear-review';await mkdir(output,{recursive:true});
const references=JSON.parse(await readFile('config/trait-review-references.json','utf8')).references;
const beforeOnly=process.argv.includes('--before-only');
const browser=await chromium.launch({args:['--renderer-process-limit=1','--num-raster-threads=1']});
const errors=[];const rows=[];const imageCache=new Map();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',error=>errors.push(error.message));
 if(beforeOnly)await page.route(/\/(chikn|roostr)-rig\.json(?:\?|$)/,async route=>{
  const species=route.request().url().match(/\/(chikn|roostr)-rig\.json/)[1];
  const body=execFileSync('git',['show',`v0.8.0:packages/chikn-rigs/data/${species}-rig.json`],{cwd:process.env.ROOST2D_REVIEW_ROOT??'../roost2d-headwear-review'});
  await route.fulfill({contentType:'application/json',body});
 });
 await page.route('**/image/*.jpeg',async route=>{
  const reference=references.find(ref=>ref.imageUrl===route.request().url());
  if(!reference)return route.abort();
  let bytes=imageCache.get(reference.imageUrl);if(!bytes){bytes=await loadReviewImage(reference);imageCache.set(reference.imageUrl,bytes);}
  return route.fulfill({contentType:'image/jpeg',body:bytes});
 });
 const ready=()=>page.getByRole('status').filter({hasText:'Ready'}).waitFor({timeout:120000});
 for(const species of ['chikn','roostr']){
  await page.goto(`http://127.0.0.1:${process.env.HEADWEAR_REVIEW_PORT??4274}/review.html?review=headwear&species=${species}`);await ready();
  if(species==='roostr'){await page.getByLabel('Skin',{exact:true}).selectOption('SnowWhite');await ready();}
  const current=await page.locator('article').evaluateAll(articles=>articles.map(article=>({id:article.dataset.id,title:article.querySelector('h2')?.textContent,image:article.querySelector('img')?.src,details:JSON.parse(article.querySelector('pre').textContent)})));
  if(!beforeOnly){await page.getByLabel('Facing',{exact:true}).selectOption('left');await ready();const left=await page.locator('article').evaluateAll(articles=>Object.fromEntries(articles.map(article=>[article.dataset.id,article.querySelector('img')?.src])));for(const row of current)row.left=left[row.id];}
  rows.push(...current.map(row=>({...row,species})));
 }
 if(errors.length)throw new Error(errors.join('\n'));
 if(beforeOnly){await writeFile(`${output}/before.json`,JSON.stringify({version:'0.8.0',rows}));console.log(`Saved ${rows.length} unchanged headwear baselines`);}
 else{
  const before=JSON.parse(await readFile(`${output}/before.json`,'utf8'));const articles=[];
  for(const row of rows){const old=before.rows.find(candidate=>candidate.species===row.species&&candidate.id===row.id);if(!old)throw new Error(`Missing baseline ${row.species}/${row.id}`);
   const ref=references.find(ref=>ref.species===row.species&&ref.traitGroupIds.includes(row.id));
   const reference=ref?`data:image/jpeg;base64,${(imageCache.get(ref.imageUrl)??await loadReviewImage(ref)).toString('base64')}`:undefined;
   articles.push(`<article><h2>${row.species}/${row.title}</h2><div class="images"><figure><img src="${old.image}"><figcaption>0.8.0</figcaption></figure><figure><img src="${row.image}"><figcaption>Corrected · right</figcaption></figure><figure><img src="${row.left}"><figcaption>Corrected · left</figcaption></figure><figure>${reference?`<img src="${reference}"><figcaption><a href="${ref.imageUrl}">${ref.artBuild} #${ref.token}</a></figcaption>`:'<p>No live V2 match</p>'}</figure></div></article>`);
  }
  await writeFile(`${output}/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><title>Chikn + Roostr headwear coverage</title><style>body{margin:16px;background:#191b20;color:white;font:14px system-ui}article{background:#292c32;padding:10px;margin:10px 0}h2{font-size:16px}.images{display:grid;grid-template-columns:repeat(4,1fr)}figure{margin:4px}img{width:100%;height:280px;object-fit:contain}a{color:#9addff}</style><h1>Headwear coverage · both species</h1><p>All ${rows.length} ordinary head traits. Covering hats conceal the comb; open accessories retain appropriate head visibility. Source artwork is unchanged.</p>${articles.join('')}</html>`);
  await writeFile(`${output}/after.json`,JSON.stringify({rows}));
  for(const species of ['chikn','roostr']){
   const subset=rows.filter(row=>row.species===species);
   for(let offset=0;offset<subset.length;offset+=16){const tiles=[];for(const row of subset.slice(offset,offset+16)){
    const image=await sharp(Buffer.from(row.image.split(',')[1],'base64')).resize(270,240,{fit:'contain'}).png().toBuffer();
    const label=Buffer.from(`<svg width="280" height="30"><text x="5" y="20" fill="white" font-family="sans-serif" font-size="12">${row.id}</text></svg>`);
    tiles.push(await sharp({create:{width:280,height:270,channels:4,background:'#292c32'}}).composite([{input:label,left:0,top:0},{input:image,left:5,top:30}]).png().toBuffer());
   }await sharp({create:{width:1120,height:Math.ceil(tiles.length/4)*270,channels:4,background:'#191b20'}}).composite(tiles.map((input,i)=>({input,left:(i%4)*280,top:Math.floor(i/4)*270}))).png().toFile(`${output}/corrected-${species}-${offset/16}.png`);}
  }
  console.log(`Saved ${rows.length} before/after comparisons, both facings and V2 references`);
 }
}finally{await browser.close();}
