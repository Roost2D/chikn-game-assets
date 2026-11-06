import assert from 'node:assert/strict';
import {chromium}from'@playwright/test';
import {readFile,writeFile,mkdir}from'node:fs/promises';
const browser=await chromium.launch({args:['--renderer-process-limit=1','--num-raster-threads=1']});const results=[],errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/image/*.jpeg',route=>route.abort());
 const ready=()=>page.getByRole('status').filter({hasText:'Ready'}).waitFor({timeout:120000});
 for(const species of ['chikn','roostr']){
  await page.goto(`http://127.0.0.1:${process.env.HEADWEAR_REVIEW_PORT??4274}/review.html?review=headwear&species=${species}&trait=__matrix__`);await ready();
  for(const profile of ['default','high']){
   await page.getByLabel('Asset profile',{exact:true}).selectOption(profile);await ready();
   const result=await page.evaluate(()=>window.verifyHeadwearAssembly());results.push(result);console.log(JSON.stringify(result));
  }
 }
 assert.deepEqual(errors,[]);assert.equal(results.reduce((sum,row)=>sum+row.frames,0),20420);
 await mkdir('.release/headwear-review',{recursive:true});await writeFile('.release/headwear-review/matrix.json',JSON.stringify({results,pageErrors:errors,frames:20420},null,2)+'\n');
}finally{await browser.close();}
