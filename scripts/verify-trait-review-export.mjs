import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
const output=resolve('.release/trait-review');
const feedback=JSON.parse(await readFile('config/trait-review-feedback.json','utf8'));
const referenceSet=JSON.parse(await readFile('config/trait-review-references.json','utf8'));
const references=referenceSet.references;
let feedbackCount=0,latestCount=0,coatCount=0,matched=references.length;
for(const species of ['chikn','roostr']){
 const ids=Object.entries(feedback[species]).flatMap(([category,names])=>names.map(name=>`${category}/${name}`));
 feedbackCount+=ids.length;latestCount+=feedback.latestCorrections[species].length;coatCount+=feedback.coatLikeTraits[species].length;
 for(const id of [...ids,...feedback.latestCorrections[species],...feedback.coatLikeTraits[species]])if(references.some(ref=>ref.species===species&&ref.traitGroupIds.includes(id)))matched++;
}
const traits=Object.values(referenceSet.coverage).reduce((sum,row)=>sum+row.traits,0);
const outfitCount=108;
const cards=traits+2+outfitCount+references.length+feedbackCount+latestCount+coatCount;
const imageUses=cards+matched;
const html=await readFile(`${output}/index.html`,'utf8');
assert.equal((html.match(/<article\b/g)??[]).length,cards);
assert.equal((html.match(/<img\b/g)??[]).length,imageUses);
assert.ok(!html.includes('/chikn/image/')&&!html.includes('/roostr/build30/'),'legacy render URLs cannot enter the current review');
const errors=[];const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',error=>errors.push(error.message));await page.route(/^https?:/,route=>route.abort());
 await page.goto(pathToFileURL(`${output}/index.html`).href);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
 await page.screenshot({path:`${output}/offline-preview.png`});assert.deepEqual(errors,[]);
}finally{await browser.close();}
const engineRoot=process.env.ROOST2D_REVIEW_ROOT??resolve('../roost2d-trait-review');
const sourceSha256=execFileSync(process.execPath,['scripts/verify-assembly-approval.mjs','--fingerprint'],{cwd:engineRoot,encoding:'utf8'}).trim();
const approval=JSON.parse(await readFile(resolve(engineRoot,'config/trait-assembly-review.json'),'utf8'));
const status={status:approval.status==='approved'&&approval.sourceSha256===sourceSha256?'owner-release-authorized':'pending-owner-review',layerPolicy:feedback.layerPolicy,referenceKind:referenceSet.referenceKind,sourceSha256,traitGroups:traits,latestCorrections:latestCount,coatLikeTraits:coatCount,earlierFeedbackTraits:feedbackCount,visualReferences:references.length,exportedCards:cards,embeddedImageUses:imageUses,htmlBytes:Buffer.byteLength(html),htmlSha256:createHash('sha256').update(html).digest('hex'),validation:{offline:`${imageUses} images decode with HTTP blocked`,pageErrors:errors},published:false,bokstrikeProcesses:'untouched'};
await writeFile(`${output}/review-status.json`,JSON.stringify(status,null,2)+'\n');
console.log(`Verified ${cards} review cards and ${imageUses} offline image uses; source ${sourceSha256}.`);
