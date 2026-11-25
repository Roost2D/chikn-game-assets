import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Official data stays in the separately classified media release, never in an engine npm tarball. */
export async function buildCoqfightEntries(rightsByPath) {
  const lock = JSON.parse(await readFile(resolve('config/coqfight-v1.lock.json'), 'utf8'));
  const toolingPath = process.env.ROOST2D_TOOLING_MODULE;
  const { importSpine42 } = await import(toolingPath ? toolingPath.startsWith('file:') ? toolingPath : pathToFileURL(resolve(toolingPath)).href : '@roost2d/tooling');
  if (typeof importSpine42 !== 'function') throw new Error('Coqfight builds require @roost2d/tooling with importSpine42 from the pinned npm release.');
  for (const entry of [...lock.documents, ...lock.images]) {
    const bytes = await readFile(resolve(entry.sourcePath));
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== entry.sha256) throw new Error(`Pinned Coqfight source changed: ${entry.sourcePath}`);
  }
  const entries = [];
  const catalog = { schema: 'chikn.coqfight-catalog/v1', setId: 'coqfight-v1', sourceVersion: '4.2.00', species: {}, animationNames: [] };
  const documentPath = (suffix) => `sources/coqfight-v1/${suffix}`;
  const add = (assetId, value, sourcePaths, mediaType = 'application/json') => {
    const buffer = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n');
    const rightsIds = [...new Set(sourcePaths.map((path) => {
      const rights = rightsByPath.get(path);
      if (!rights || rights.license !== 'CHIKN-COMMUNITY-NONCOMMERCIAL') throw new Error(`Official Coqfight data must retain upstream rights: ${path}`);
      return rights.id;
    }))];
    entries.push({ assetId, aliases: [], group: 'coqfight-v1', kind: 'data', mediaType, runtimePath: `runtime/${assetId}${mediaType === 'application/json' ? '.json' : '.md'}`, sourcePaths, rightsIds, buffer });
  };
  for (const species of ['chikn', 'roostr']) {
    const sourcePath = documentPath(`${species}/${species}.json`);
    const source = JSON.parse(await readFile(resolve(sourcePath), 'utf8'));
    const mappings = new Map(lock.images.filter((image) => image.species === species).map((image) => [image.path, image]));
    const result = importSpine42(source, {
      id: `coqfight-v1.${species}`,
      animationIdPrefix: `coqfight-v1.${species}.`,
      loopAnimations: ['Idle', 'IdleHurt', 'Walk', 'Run', 'Victory', 'Flap'],
      resolveTexture(path, context) {
        const image = mappings.get(path);
        if (!image) throw new Error(`Unpinned Coqfight texture: ${species}/${path}`);
        if (image.width !== context.width || image.height !== context.height) throw new Error(`Coqfight image dimensions differ from attachment dimensions: ${species}/${path}`);
        return { assetId: image.alias };
      },
    });
    catalog.species[species] = { bodySkinIds: result.metadata.bodySkinIds, traitSkinIds: result.metadata.traitSkinIds };
    catalog.animationNames = result.metadata.animationNames;
    add(`coqfight-v1/${species}/rig`, result.definition, [sourcePath]);
    add(`coqfight-v1/${species}/animations`, result.clips, [sourcePath]);
    const metaPath = documentPath(`${species}/${species}-animations-meta.json`);
    add(`coqfight-v1/${species}/animation-meta`, JSON.parse(await readFile(resolve(metaPath), 'utf8')), [metaPath]);
  }
  const rulesPath = documentPath('traits/trait-rules.json');
  add('coqfight-v1/catalog', catalog, ['chikn', 'roostr'].map((species) => documentPath(`${species}/${species}.json`)));
  add('coqfight-v1/trait-rules', JSON.parse(await readFile(resolve(rulesPath), 'utf8')), [rulesPath]);
  const traitsPath = documentPath('traits/traits.json');
  add('coqfight-v1/trait-catalog', JSON.parse(await readFile(resolve(traitsPath), 'utf8')), [traitsPath]);
  const licensePath = documentPath('LICENSE.md');
  add('coqfight-v1/LICENSE', await readFile(resolve(licensePath)), [licensePath], 'text/markdown');
  return entries;
}
