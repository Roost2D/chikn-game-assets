import { readFile, writeFile } from 'node:fs/promises';
import { V2_ART_BUILDS } from './trait-review-images.mjs';

// Deliberate reference-only maintenance: no source artwork or rights records.
const path = 'config/trait-review-references.json';
const review = JSON.parse(await readFile(path, 'utf8'));
const artBuilds = V2_ART_BUILDS;
for (const species of ['chikn', 'roostr']) {
  const url = new URL(`https://api.chikn.farm/api/${species}/list`);
  url.searchParams.set('limit', species === 'chikn' ? '10000' : '12000');
  for (const field of ['token', 'filename']) url.searchParams.append('projection', field);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${species}: ${response.status}`);
  const listing = await response.json();
  if (listing.data.length !== listing.totalCount) throw new Error(`Incomplete ${species} filename inventory`);
  const filenames = new Map(listing.data.map(row => [Number(row.token), row.filename]));
  for (const reference of review.references.filter(ref => ref.species === species)) {
    const filename = filenames.get(reference.token);
    if (typeof filename !== 'string' || !/^[a-f0-9]+\.jpe?g$/i.test(filename)) throw new Error(`Missing/invalid V2 filename: ${species}/${reference.token}`);
    reference.filename = filename;
    reference.artBuild = artBuilds[species];
    reference.imageUrl = `https://chikn-farm.sfo3.cdn.digitaloceanspaces.com/${reference.artBuild}/image/${filename}`;
    reference.referenceUrl = reference.imageUrl;
    delete reference.metadataUrl;
    delete reference.nftUrl;
  }
}
review.referenceKind = 'v2-visuals';
review.artBuilds = artBuilds;
review.source = 'Roost Rift Game/src/ui/HtmlUI/CodexController.js: V2 visual URLs using the official API filename field';
review.retrievedOn = new Date().toISOString().slice(0, 10);
await writeFile(path, JSON.stringify(review, null, 2) + '\n');
console.log(`Updated ${review.references.length} references to Chikn V2 / Roostr V2 visuals.`);
