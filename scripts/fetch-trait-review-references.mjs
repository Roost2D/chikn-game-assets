import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadChiknRig, loadRoostrRig } from '@roost2d/chikn-rigs';
import { V2_ART_BUILDS } from './trait-review-images.mjs';

// Explicit maintenance command. Never called by builds, tests, or release gates.
// Project only visual metadata; wallet/owner/market fields are neither requested nor retained.
const fileFetch = async url => new Response(await readFile(url));
const normalize = value => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = { roostr: { 'head/grandpa': 'Ropians Hat', 'head/beard': 'Hairy Old Man' } };
const references = [];
const coverage = {};
await mkdir('.release/trait-review', { recursive: true });
for (const species of ['chikn', 'roostr']) {
  const definition = await (species === 'chikn' ? loadChiknRig : loadRoostrRig)(fileFetch);
  const groups = Object.values(definition.attachmentGroups);
  const wanted = new Set([...groups.map(g => g.id), ...Object.keys(definition.skins).map(s => `skin:${s}`)]);
  const url = new URL(`https://api.chikn.farm/api/${species}/list`);
  url.searchParams.set('limit', species === 'chikn' ? '10000' : '12000');
  url.searchParams.set('sortAsc', 'token');
  for (const field of ['token', 'filename', 'body', 'head', 'neck', 'torso', 'feet', 'tail']) url.searchParams.append('projection', field);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const listing = await response.json();
  if (listing.data.length !== listing.totalCount) throw new Error(`Incomplete ${species} reference inventory`);
  const candidates = listing.data.flatMap(row => {
    const skinId = Object.keys(definition.skins).find(s => normalize(s) === normalize(row.body ?? ''));
    if (!skinId) return [];
    const traitGroupIds = groups.filter(g => [String(g.metadata.name), aliases[species]?.[g.id]].filter(Boolean).some(name => normalize(name) === normalize(row[String(g.metadata.category).toLowerCase()] ?? ''))).map(g => g.id);
    return [{ token: row.token, filename: row.filename, skinId, traitGroupIds, covers: [`skin:${skinId}`, ...traitGroupIds] }];
  });
  const chosen = [];
  while (true) {
    candidates.sort((a, b) => b.covers.filter(id => wanted.has(id)).length - a.covers.filter(id => wanted.has(id)).length || a.token - b.token);
    const best = candidates.shift();
    if (!best || !best.covers.some(id => wanted.has(id))) break;
    for (const id of best.covers) wanted.delete(id);
    chosen.push(best);
  }
  for (const chosenRow of chosen) {
    const { covers, ...row } = chosenRow;
    if (typeof row.filename !== 'string' || !/^[a-f0-9]+\.jpe?g$/i.test(row.filename)) throw new Error(`Invalid V2 filename: ${species}/${row.token}`);
    const artBuild = V2_ART_BUILDS[species];
    const imageUrl = `https://chikn-farm.sfo3.cdn.digitaloceanspaces.com/${artBuild}/image/${row.filename}`;
    references.push({ species, ...row, artBuild, imageUrl, referenceUrl: imageUrl });
  }
  coverage[species] = { traits: groups.length, skins: Object.keys(definition.skins).length, referenceCount: chosen.length, missing: [...wanted] };
}
await writeFile(resolve('config/trait-review-references.json'), JSON.stringify({
  schema: 'chikn-game-assets.trait-review-references/v1',
  retrievedOn: new Date().toISOString().slice(0, 10),
  source: 'Roost Rift Game/src/ui/HtmlUI/CodexController.js: V2 visual URLs using the official API filename field',
  referenceKind: 'v2-visuals',
  artBuilds: V2_ART_BUILDS,
  coverage,
  references,
}, null, 2) + '\n');
console.log(coverage);
