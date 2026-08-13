import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { loadChiknPack, type AssetProfileId } from '@chikn-game-assets/runtime';
import { AssetManifestResolver, LazyAssetLoader } from '@roost2d/assets';
import {
  applyCharacterRecipe,
  CHARACTER_RECIPE_SCHEMA,
  loadChiknAnimations,
  loadChiknRig,
  loadRoostrAnimations,
  loadRoostrRig,
  mergeUniqueSkin,
  UNIQUE_SKINS,
  uniqueAssetPrefix,
  type CharacterRecipeV1,
  type ChiknSpecies,
} from '@roost2d/chikn-rigs';
import type { RigDefinitionV1, TextureRef } from '@roost2d/contracts';
import { PixiAssetLoader, PixiRigFactory } from '@roost2d/pixi';
import { RigRuntime } from '@roost2d/rig2d';
import { RouteLifecycle, type RouteSession } from './lifecycle';
import './style.css';

interface CatalogAsset {
  id: string;
  aliases: string[];
  group: string;
  kind: string;
  mediaType: string;
  thumbnail?: string;
  audio?: string;
  width?: number;
  height?: number;
  sourcePaths: string[];
  license: string;
  ownership?: string;
  attribution?: string;
  hostingAuthorized?: boolean;
  communityUseAuthorized?: boolean;
  sublicenseGrantedByRepository?: false;
  commercialUse: string;
}

interface Catalog {
  schema: string;
  version: string;
  totals: { assets: number; images: number; audio: number };
  assets: CatalogAsset[];
}

const REPOSITORY_BLOB = 'https://github.com/Roost2D/chikn-game-assets/blob/main/';
const host = document.querySelector<HTMLElement>('#app')!;
const catalog = await fetch('./data/catalog.json').then((response) => {
  if (!response.ok) throw new Error(`Catalog ${response.status}`);
  return response.json() as Promise<Catalog>;
});
const routes = ['showcase', 'builder', 'rig', 'farmland', 'game'] as const;
type Route = typeof routes[number];

const lifecycle = new RouteLifecycle();

async function render() {
  const session = lifecycle.begin();
  const route = (routes.includes(location.hash.slice(1) as Route) ? location.hash.slice(1) : 'showcase') as Route;
  document.querySelectorAll('nav a').forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${route}`));
  host.replaceChildren();
  if (route === 'showcase') renderShowcase();
  if (route === 'builder') await renderBuilder(session);
  if (route === 'rig') await renderRig(session);
  if (route === 'farmland') await renderFarmland(session);
  if (route === 'game') await renderGame(session);
}

/** Catalog values are interpolated nowhere: every dynamic value is set as text or a property. */
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hero(eyebrow: string, title: string, copy: string) {
  const node = element('section', 'hero');
  const inner = element('div');
  inner.append(element('div', 'eyebrow', eyebrow), element('h1', undefined, title), element('p', 'muted', copy));
  node.append(inner);
  return node;
}

/** Source paths come off disk unslugified, so encode each segment before it lands in a URL. */
function sourceRecordUrl(sourcePath: string | undefined): string | undefined {
  if (!sourcePath) return undefined;
  return REPOSITORY_BLOB + sourcePath.split('/').map(encodeURIComponent).join('/');
}

const RIGHTS_ROWS: ReadonlyArray<readonly [string, string]> = [
  ['Owner', 'Chikn rights-holder'],
  ['Hosted by', 'Roost2D with permission'],
  ['Community use', 'Non-commercial'],
  ['Commercial use', 'Separate Chikn agreement required'],
  ['Repository sublicense', 'None'],
];

function rightsRows(asset: CatalogAsset): ReadonlyArray<readonly [string, string]> {
  if (asset.license === 'Apache-2.0') return [
    ['Owner', 'Roost2D project'],
    ['License', 'Apache-2.0'],
    ['Commercial use', 'Allowed under Apache-2.0'],
    ['Attribution', asset.attribution ?? 'Roost2D project artwork'],
  ];
  return RIGHTS_ROWS;
}

function createCardTemplate() {
  const card = element('article', 'asset-card');
  const image = element('img');
  image.loading = 'lazy';
  const info = element('div', 'asset-info');
  const title = element('strong');
  const dimensions = element('small');
  const rights = element('dl', 'rights-summary');
  const link = element('a', undefined, 'Hosted source record');
  link.target = '_blank';
  link.rel = 'noreferrer';
  info.append(title, dimensions, rights, link);
  card.append(image, info);
  return card;
}

function renderShowcase() {
  host.append(hero(`${catalog.totals.assets.toLocaleString()} publicly hosted assets`, 'The Chikn community asset shelf.', `Search every hosted visual and play all ${catalog.totals.audio.toLocaleString()} audio files.`));

  const controls = element('div', 'controls');
  const search = element('input');
  search.type = 'search';
  search.setAttribute('aria-label', 'Search assets');
  search.placeholder = 'Search ID or source path';

  const group = element('select');
  group.setAttribute('aria-label', 'Asset group');
  group.append(new Option('All groups', ''));
  for (const name of [...new Set(catalog.assets.map((asset) => asset.group))].sort()) group.append(new Option(name, name));

  const species = element('select');
  species.setAttribute('aria-label', 'Species');
  for (const [label, value] of [['All content', ''], ['Audio', 'audio'], ['Chikn', 'chikn'], ['Roostr', 'roostr'], ['FarmLand', 'farmland']]) {
    species.append(new Option(label, value));
  }

  controls.append(search, group, species);
  host.append(controls);

  const grid = element('div', 'asset-grid');
  host.append(grid);

  const template = createCardTemplate();
  const update = () => {
    const query = search.value.toLowerCase();
    const visible = catalog.assets.filter((asset) => (!query || `${asset.id} ${asset.sourcePaths.join(' ')}`.toLowerCase().includes(query))
      && (!group.value || asset.group === group.value)
      && (!species.value || asset.id.includes(species.value)));

    const fragment = document.createDocumentFragment();
    for (const asset of visible) {
      const card = template.cloneNode(true) as HTMLElement;
      const image = card.querySelector('img')!;
      if (asset.audio) {
        const player = element('audio');
        player.controls = true;
        player.preload = 'none';
        player.src = asset.audio;
        player.setAttribute('aria-label', asset.id);
        image.replaceWith(player);
      } else {
        if (!asset.thumbnail) throw new Error(`Catalog image ${asset.id} has no thumbnail`);
        image.src = asset.thumbnail;
        image.alt = asset.id;
      }
      const title = card.querySelector('strong')!;
      title.textContent = asset.id;
      title.title = asset.id;
      const rights = card.querySelector('.rights-summary')!;
      for (const [term, description] of rightsRows(asset)) {
        const row = element('div');
        row.append(element('dt', undefined, term), element('dd', undefined, description));
        rights.append(row);
      }
      card.querySelector('small')!.textContent = asset.audio ? `MP3 · ${asset.group}` : `${asset.width}×${asset.height} · ${asset.group}`;
      const link = card.querySelector('a')!;
      const href = sourceRecordUrl(asset.sourcePaths[0]);
      if (href) link.href = href; else link.remove();
      fragment.append(card);
    }
    grid.replaceChildren(fragment);
  };
  controls.addEventListener('input', update);
  update();
}

/**
 * Pixi holds a WebGL context and a running ticker; removing the canvas from the DOM releases
 * neither. Every Application is registered for teardown, and a stale session destroys it on
 * arrival rather than leaving it running behind the route that replaced it.
 */
async function createStage(session: RouteSession, className = 'stage', transparent = false) {
  const stage = element('div', className);
  const app = new Application();
  await app.init({
    width: 760,
    height: 560,
    ...(transparent ? { backgroundAlpha: 0 } : { background: '#18150f' }),
    antialias: true,
    resolution: Math.min(devicePixelRatio, 2),
    autoDensity: true,
  });
  session.onTeardown(() => app.destroy(true, { children: true, texture: false }));
  stage.append(app.canvas);
  return { stage, app };
}

async function loadSprite(asset: CatalogAsset) {
  if (!asset.thumbnail) throw new Error(`Cannot load non-visual asset ${asset.id} as a sprite`);
  const texture = await Assets.load<Texture>(asset.thumbnail);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  return sprite;
}

async function createRuntimeTextureLoader(profile: AssetProfileId = 'default') {
  const baseUrl = new URL('./data/', document.baseURI);
  const pack = await loadChiknPack({ baseUrl, profile });
  const resolver = new AssetManifestResolver(pack.manifest, { baseUrl, profile: pack.profile });
  const integrityLoader = new LazyAssetLoader(resolver);
  return { pack, textures: new PixiAssetLoader(resolver, integrityLoader) };
}

async function renderBuilder(session: RouteSession) {
  host.append(hero('Rig recipe builder', 'Build one bird. Animate the same bird.', 'Choose a Chikn or Roostr skin and one trait per category. Replacement traits own their feather slots, every part stays on the rig, and exports use the same recipe as the live animation.'));
  const layout = element('div', 'workspace');
  const panel = element('section', 'panel');
  const speciesSelect = element('select');
  speciesSelect.setAttribute('aria-label', 'Builder species');
  speciesSelect.append(new Option('Chikn', 'chikn'), new Option('Roostr', 'roostr'));
  const profileSelect = element('select');
  profileSelect.setAttribute('aria-label', 'Builder asset profile');
  profileSelect.append(new Option('Default', 'default'), new Option('High', 'high'));
  const skinSelect = element('select');
  skinSelect.setAttribute('aria-label', 'Builder skin');
  const uniqueSelect = element('select');
  uniqueSelect.setAttribute('aria-label', 'Builder unique');
  const traitFields = element('div', 'trait-fields');
  const traitSelects = new Map<string, HTMLSelectElement>();

  const animationSelect = element('select');
  animationSelect.setAttribute('aria-label', 'Builder animation');

  const scaleOutput = element('output');
  scaleOutput.id = 'scale-out';
  scaleOutput.textContent = '1';
  const scaleInput = element('input');
  Object.assign(scaleInput, { id: 'scale', type: 'range', min: '0.5', max: '1.8', step: '0.05', value: '1' });

  const tintInput = element('input');
  Object.assign(tintInput, { id: 'tint', type: 'color', value: '#ffffff' });

  const mirrorButton = element('button', undefined, 'Mirror');
  const randomButton = element('button', undefined, 'Random');
  const exportRecipeButton = element('button', 'primary', 'Export recipe');
  const exportReferenceButton = element('button', undefined, 'Export PNG');
  const exportSheetButton = element('button', undefined, 'Export animation sheet');
  const exportSheetMetadataButton = element('button', undefined, 'Export animation JSON');
  const status = element('pre', 'config', 'Loading canonical rig...');

  panel.append(
    field('Species', speciesSelect),
    field('Asset profile', profileSelect),
    field('Normal skin', skinSelect),
    field('Unique', uniqueSelect),
    traitFields,
    field('Animation', animationSelect),
    field('Scale ', scaleInput, scaleOutput),
    field('Tint', tintInput),
    mirrorButton, randomButton, exportRecipeButton, exportReferenceButton, exportSheetButton, exportSheetMetadataButton, status,
  );

  const { stage, app } = await createStage(session, 'stage builder-stage', true);
  if (session.isStale) return;
  layout.append(panel, stage);
  host.append(layout);

  const definitions = new Map<ChiknSpecies, RigDefinitionV1>();
  const clipsBySpecies = new Map<ChiknSpecies, Awaited<ReturnType<typeof loadChiknAnimations>>>();
  let current: { rig: RigRuntime; factory: PixiRigFactory; textures: PixiAssetLoader; definition: RigDefinitionV1; clips: Awaited<ReturnType<typeof loadChiknAnimations>> } | undefined;
  let refreshGeneration = 0;
  let mirrored = false;

  const setOptions = (select: HTMLSelectElement, options: ReadonlyArray<readonly [string, string]>, previous?: string) => {
    select.replaceChildren(...options.map(([label, value]) => new Option(label, value)));
    if (previous && [...select.options].some(({ value }) => value === previous)) select.value = previous;
  };

  const loadMetadata = async (species: ChiknSpecies) => {
    let definition = definitions.get(species);
    let clips = clipsBySpecies.get(species);
    if (!definition) {
      definition = species === 'chikn' ? await loadChiknRig() : await loadRoostrRig();
      definitions.set(species, definition);
    }
    if (!clips) {
      clips = species === 'chikn' ? await loadChiknAnimations() : await loadRoostrAnimations();
      clipsBySpecies.set(species, clips);
    }
    return { definition, clips };
  };

  const disposeCurrent = async () => {
    const active = current;
    current = undefined;
    if (!active) return;
    active.rig.dispose();
    active.factory.destroyRoot();
    await active.textures.clear();
  };
  session.onTeardown(() => { refreshGeneration += 1; void disposeCurrent(); });

  const recipe = (definition = current?.definition): CharacterRecipeV1 => {
    const unique = UNIQUE_SKINS.find((entry) => entry.species === speciesSelect.value && String(entry.token) === uniqueSelect.value);
    const skinId = unique?.skinId ?? skinSelect.value ?? definition?.defaultSkinId ?? '';
    return {
      schema: CHARACTER_RECIPE_SCHEMA,
      species: speciesSelect.value as ChiknSpecies,
      skinId,
      traitGroupIds: [...traitSelects.values()].map(({ value }) => value).filter(Boolean),
      animationId: animationSelect.value || undefined,
      mirrored,
      tint: Number.parseInt(tintInput.value.slice(1), 16),
      renderScale: Number(scaleInput.value),
    };
  };

  const updateStatus = () => {
    if (!current) return;
    const value = recipe();
    const replacementSlots = value.traitGroupIds.flatMap((id) => current?.definition.attachmentGroups?.[id]?.replacesSlotIds ?? []);
    status.textContent = JSON.stringify({
      ...value,
      contentTerms: 'CHIKN-COMMUNITY-NONCOMMERCIAL',
      repositorySublicense: false,
      replacementSlots: [...new Set(replacementSlots)],
      activeAttachments: current.rig.activeAttachmentIds(),
    }, null, 2);
  };

  const applyLiveRecipe = () => {
    if (!current) return;
    const value = recipe();
    applyCharacterRecipe(current.rig, value, current.definition, current.clips);
    current.factory.root.scale.set(1);
    const bounds = current.factory.root.getLocalBounds();
    const fitScale = Math.min(
      app.screen.width * 0.72 / Math.max(1, bounds.width),
      app.screen.height * 0.72 / Math.max(1, bounds.height),
    );
    current.factory.root.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    current.factory.root.position.set(app.screen.width / 2, app.screen.height / 2);
    current.factory.root.scale.set(fitScale * (value.renderScale ?? 1));
    scaleOutput.textContent = scaleInput.value;
    updateStatus();
  };

  const updateControls = async () => {
    const species = speciesSelect.value as ChiknSpecies;
    const { definition, clips } = await loadMetadata(species);
    if (session.isStale) return;
    setOptions(skinSelect, Object.keys(definition.skins ?? {}).map((id) => [id, id] as const), definition.defaultSkinId);
    setOptions(uniqueSelect, [['None', ''], ...UNIQUE_SKINS.filter((entry) => entry.species === species).map((entry) => [`#${entry.token} - ${entry.skinId}`, String(entry.token)] as const)]);
    setOptions(animationSelect, clips.map((clip) => [clip.id.replace(`${species}.`, ''), clip.id] as const));
    traitSelects.clear();
    traitFields.replaceChildren();
    const groups = Object.values(definition.attachmentGroups ?? {});
    const categories = [...new Set(groups.map((group) => String(group.metadata?.category ?? '')).filter(Boolean))];
    const preferred = ['Head', 'Neck', 'Torso', 'Feet', 'Tail', 'Wings'];
    for (const category of [...preferred, ...categories.filter((value) => !preferred.includes(value))].filter((value) => categories.includes(value))) {
      const select = element('select');
      select.setAttribute('aria-label', `${category} trait`);
      setOptions(select, [
        ['None', ''],
        ...groups.filter((group) => String(group.metadata?.category ?? '') === category).map((group) => [String(group.metadata?.name ?? group.id), group.id] as const),
      ]);
      select.addEventListener('change', applyLiveRecipe, { signal: session.signal });
      traitSelects.set(category, select);
      traitFields.append(field(`${category} trait`, select));
    }
  };

  const refreshResources = async () => {
    const generation = ++refreshGeneration;
    status.textContent = 'Loading integrity-checked rig textures...';
    await disposeCurrent();
    try {
      const species = speciesSelect.value as ChiknSpecies;
      const { definition: baseDefinition, clips } = await loadMetadata(species);
      const { pack, textures } = await createRuntimeTextureLoader(profileSelect.value as AssetProfileId);
      let definition = baseDefinition;
      const unique = UNIQUE_SKINS.find((entry) => entry.species === species && String(entry.token) === uniqueSelect.value);
      if (unique) definition = mergeUniqueSkin(definition, unique, pack.assetIds.filter((id) => id.startsWith(uniqueAssetPrefix(unique))));
      const references = new Map<string, TextureRef>();
      for (const { texture } of definition.attachments) references.set(texture.frameId ? `${texture.assetId}#${texture.frameId}` : texture.assetId, texture);
      const entries = await Promise.all([...references].map(async ([key, texture]) => [key, await textures.load(texture.assetId)] as const));
      if (session.isStale || generation !== refreshGeneration) { await textures.clear(); return; }
      const factory = new PixiRigFactory(new Map(entries));
      const rig = new RigRuntime(definition, factory, clips);
      current = { rig, factory, textures, definition, clips };
      app.stage.addChild(factory.root);
      applyLiveRecipe();
    } catch (error) {
      if (generation === refreshGeneration) status.textContent = error instanceof Error ? error.message : String(error);
    }
  };

  speciesSelect.addEventListener('change', async () => { await updateControls(); await refreshResources(); }, { signal: session.signal });
  profileSelect.addEventListener('change', () => void refreshResources(), { signal: session.signal });
  uniqueSelect.addEventListener('change', () => void refreshResources(), { signal: session.signal });
  skinSelect.addEventListener('change', applyLiveRecipe, { signal: session.signal });
  animationSelect.addEventListener('change', applyLiveRecipe, { signal: session.signal });
  tintInput.addEventListener('input', applyLiveRecipe, { signal: session.signal });
  scaleInput.addEventListener('input', applyLiveRecipe, { signal: session.signal });
  mirrorButton.addEventListener('click', () => { mirrored = !mirrored; applyLiveRecipe(); }, { signal: session.signal });
  randomButton.addEventListener('click', () => {
    skinSelect.selectedIndex = Math.floor(Math.random() * Math.max(1, skinSelect.options.length));
    uniqueSelect.value = '';
    for (const select of traitSelects.values()) select.selectedIndex = Math.random() < 0.35 ? 0 : 1 + Math.floor(Math.random() * Math.max(1, select.options.length - 1));
    applyLiveRecipe();
  }, { signal: session.signal });
  exportRecipeButton.addEventListener('click', () => downloadJson(`${speciesSelect.value}-character-recipe.json`, recipe()), { signal: session.signal });
  exportReferenceButton.addEventListener('click', () => {
    if (!current) return;
    app.render();
    void downloadCanvas(`${speciesSelect.value}-character-reference.png`, app.canvas);
  }, { signal: session.signal });
  exportSheetButton.addEventListener('click', () => {
    if (!current) return;
    const value = recipe();
    const clip = current.clips.find(({ id }) => id === value.animationId);
    if (!clip) return;
    void exportAnimationSheet(app, current.rig, value, clip.durationMs)
      .catch((error: unknown) => { status.textContent = error instanceof Error ? error.message : String(error); })
      .finally(applyLiveRecipe);
  }, { signal: session.signal });
  exportSheetMetadataButton.addEventListener('click', () => {
    if (!current) return;
    const value = recipe();
    const clip = current.clips.find(({ id }) => id === value.animationId);
    if (!clip) return;
    const { stem, metadata } = animationSheetDescriptor(value, clip.durationMs);
    downloadJson(`${stem}.json`, metadata);
  }, { signal: session.signal });

  await updateControls();
  await refreshResources();
}

async function renderRig(session: RouteSession) {
  host.append(hero('Canonical integration', 'Animated Rig', 'Exercise the released manifest, integrity loader, Chikn rig metadata, renderer-neutral runtime, and Pixi adapter with no application-side scale, parenting, or depth fixes.'));
  const layout = element('div', 'workspace');
  const panel = element('section', 'panel');
  const speciesSelect = element('select');
  speciesSelect.setAttribute('aria-label', 'Species');
  speciesSelect.append(new Option('Chikn', 'chikn'), new Option('Roostr', 'roostr'));
  const profileSelect = element('select');
  profileSelect.setAttribute('aria-label', 'Asset profile');
  profileSelect.append(new Option('Default', 'default'), new Option('High', 'high'));
  const skinSelect = element('select');
  skinSelect.setAttribute('aria-label', 'Normal skin');
  const uniqueSelect = element('select');
  uniqueSelect.setAttribute('aria-label', 'Unique');
  const categorySelect = element('select');
  categorySelect.setAttribute('aria-label', 'Trait slot');
  const traitSelect = element('select');
  traitSelect.setAttribute('aria-label', 'Trait');
  const animationSelect = element('select');
  animationSelect.setAttribute('aria-label', 'Animation');
  const status = element('pre', 'config', 'Loading rig metadata...');
  panel.append(
    field('Species', speciesSelect),
    field('Asset profile', profileSelect),
    field('Normal skin', skinSelect),
    field('Unique', uniqueSelect),
    field('Trait slot', categorySelect),
    field('Trait', traitSelect),
    field('Animation', animationSelect),
    status,
  );

  const { stage, app } = await createStage(session, 'stage rig-stage');
  if (session.isStale) return;
  layout.append(panel, stage);
  host.append(layout);

  const definitions = new Map<ChiknSpecies, RigDefinitionV1>();
  const clipsBySpecies = new Map<ChiknSpecies, Awaited<ReturnType<typeof loadChiknAnimations>>>();
  let current: { rig: RigRuntime; factory: PixiRigFactory; textures: PixiAssetLoader } | undefined;
  let refreshGeneration = 0;

  const disposeCurrent = async () => {
    const active = current;
    current = undefined;
    if (!active) return;
    active.rig.dispose();
    active.factory.destroyRoot();
    await active.textures.clear();
  };
  session.onTeardown(() => { refreshGeneration += 1; void disposeCurrent(); });

  const loadMetadata = async (species: ChiknSpecies) => {
    let definition = definitions.get(species);
    let clips = clipsBySpecies.get(species);
    if (!definition) {
      definition = species === 'chikn' ? await loadChiknRig() : await loadRoostrRig();
      definitions.set(species, definition);
    }
    if (!clips) {
      clips = species === 'chikn' ? await loadChiknAnimations() : await loadRoostrAnimations();
      clipsBySpecies.set(species, clips);
    }
    return { definition, clips };
  };

  const setOptions = (select: HTMLSelectElement, options: ReadonlyArray<readonly [string, string]>, previous?: string) => {
    select.replaceChildren(...options.map(([label, value]) => new Option(label, value)));
    if (previous && [...select.options].some(({ value }) => value === previous)) select.value = previous;
  };

  const updateTraitOptions = (definition: RigDefinitionV1) => {
    const category = categorySelect.value;
    const groups = Object.values(definition.attachmentGroups ?? {}).filter((group) => String(group.metadata?.category ?? '').toLowerCase() === category.toLowerCase());
    setOptions(traitSelect, [
      ['None', ''],
      ...groups.map((group) => [String(group.metadata?.name ?? group.id), group.id] as const),
    ], traitSelect.value);
  };

  const updateMetadataControls = async () => {
    const species = speciesSelect.value as ChiknSpecies;
    const { definition, clips } = await loadMetadata(species);
    if (session.isStale) return;
    setOptions(skinSelect, Object.keys(definition.skins ?? {}).map((id) => [id, id] as const), definition.defaultSkinId);
    setOptions(uniqueSelect, [
      ['None', ''],
      ...UNIQUE_SKINS.filter((entry) => entry.species === species).map((entry) => [`#${entry.token} Â· ${entry.skinId}`, String(entry.token)] as const),
    ]);
    const categories = [...new Set(Object.values(definition.attachmentGroups ?? {}).map((group) => String(group.metadata?.category ?? '')).filter(Boolean))];
    const preferred = ['Head', 'Neck', 'Torso', 'Feet', 'Tail', 'Wings'];
    setOptions(categorySelect, [...preferred, ...categories.filter((category) => !preferred.includes(category))].map((category) => [category, category] as const));
    updateTraitOptions(definition);
    setOptions(animationSelect, clips.map((clip) => [clip.id.replace(`${species}.`, ''), clip.id] as const));
  };

  const refresh = async () => {
    const generation = ++refreshGeneration;
    status.textContent = 'Loading integrity-checked atlas frames...';
    await disposeCurrent();
    try {
      const species = speciesSelect.value as ChiknSpecies;
      const { definition: baseDefinition, clips } = await loadMetadata(species);
      const { pack, textures } = await createRuntimeTextureLoader(profileSelect.value as AssetProfileId);
      let definition = baseDefinition;
      const unique = UNIQUE_SKINS.find((entry) => entry.species === species && String(entry.token) === uniqueSelect.value);
      if (unique) {
        definition = mergeUniqueSkin(definition, unique, pack.assetIds.filter((id) => id.startsWith(uniqueAssetPrefix(unique))));
      }
      const references = new Map<string, TextureRef>();
      for (const { texture } of definition.attachments) references.set(texture.frameId ? `${texture.assetId}#${texture.frameId}` : texture.assetId, texture);
      const entries = await Promise.all([...references].map(async ([key, texture]) => [key, await textures.load(texture.assetId)] as const));
      if (session.isStale || generation !== refreshGeneration) { await textures.clear(); return; }

      const factory = new PixiRigFactory(new Map(entries));
      const rig = new RigRuntime(definition, factory, clips);
      current = { rig, factory, textures };
      app.stage.addChild(factory.root);
      factory.root.position.set(380, 365);
      rig.applySkin(unique?.skinId ?? skinSelect.value);
      if (traitSelect.value) rig.attachGroup(traitSelect.value);
      if (animationSelect.value) rig.play(animationSelect.value, { layer: 'base' });
      status.textContent = JSON.stringify({
        species,
        profile: pack.profile,
        skin: unique?.skinId ?? skinSelect.value,
        trait: traitSelect.value || null,
        animation: animationSelect.value,
        textures: references.size,
        applicationCompensation: 'none',
      }, null, 2);
    } catch (error) {
      if (generation === refreshGeneration) status.textContent = error instanceof Error ? error.message : String(error);
    }
  };

  speciesSelect.addEventListener('change', async () => { await updateMetadataControls(); await refresh(); }, { signal: session.signal });
  categorySelect.addEventListener('change', async () => { const { definition } = await loadMetadata(speciesSelect.value as ChiknSpecies); updateTraitOptions(definition); await refresh(); }, { signal: session.signal });
  for (const select of [profileSelect, skinSelect, uniqueSelect, traitSelect]) select.addEventListener('change', () => void refresh(), { signal: session.signal });
  animationSelect.addEventListener('change', () => {
    if (!current) return;
    current.rig.stop('base');
    current.rig.play(animationSelect.value, { layer: 'base' });
  }, { signal: session.signal });

  await updateMetadataControls();
  await refresh();
}

function field(label: string, control: HTMLElement, extra?: HTMLElement) {
  const wrapper = element('div', 'field');
  const caption = element('label', undefined, label);
  if (extra) caption.append(extra);
  wrapper.append(caption, control);
  return wrapper;
}

async function renderFarmland(session: RouteSession) {
  host.append(hero('FarmLand Viewer', 'Compose an isometric 6×4 farm.', 'Render logical FarmLand IDs through the release manifest, integrity loader, and Pixi atlas-frame adapter; pan or zoom and replace any selected cell.'));
  const layout = element('div', 'workspace');
  const panel = element('section', 'panel');
  const farmland = catalog.assets.filter((asset) => asset.group === 'farmland' && !asset.id.includes('/overlays/')).slice(0, 42);

  panel.append(element('h2', undefined, 'Tile palette'));
  const list = element('div', 'farm-list');
  for (const asset of farmland) {
    if (!asset.thumbnail) continue;
    const button = element('button');
    button.title = asset.id;
    button.dataset.id = asset.id;
    const image = element('img');
    image.src = asset.thumbnail;
    image.alt = asset.id;
    button.append(image);
    list.append(button);
  }
  const tileInfo = element('pre', 'config', 'Select a tile.');
  panel.append(list, element('p', 'muted', 'Wheel/pinch to zoom · drag to pan · click a diamond to select.'), tileInfo);

  const { stage, app } = await createStage(session);
  if (session.isStale) return;
  const { pack, textures } = await createRuntimeTextureLoader('default');
  if (session.isStale) { await textures.clear(); return; }
  session.onTeardown(() => { void textures.clear(); });
  layout.append(panel, stage);
  host.append(layout);

  const world = new Container();
  world.position.set(380, 100);
  app.stage.addChild(world);
  let selected = farmland[0]!;
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 6; x += 1) {
    const initial = farmland[(x + y * 3) % farmland.length]!;
    const sprite = new Sprite(await textures.load(initial.id));
    if (session.isStale) { sprite.destroy(); return; }
    sprite.anchor.set(0.5);
    sprite.scale.set(128 / Math.max(sprite.texture.width, sprite.texture.height));
    sprite.position.set((x - y) * 64, (x + y) * 32);
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    sprite.on('pointertap', () => {
      tileInfo.textContent = JSON.stringify({ cell: { x, y }, assetId: selected.id }, null, 2);
      void textures.load(selected.id).then((texture) => {
        if (session.isStale) return;
        sprite.texture = texture;
        sprite.scale.set(128 / Math.max(texture.width, texture.height));
      });
    });
    world.addChild(sprite);
  }
  panel.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
    if (button) selected = catalog.assets.find((asset) => asset.id === button.dataset.id) ?? selected;
  }, { signal: session.signal });

  let dragging = false;
  let last = { x: 0, y: 0 };
  app.canvas.addEventListener('pointerdown', (event) => { dragging = true; last = { x: event.clientX, y: event.clientY }; }, { signal: session.signal });
  app.canvas.addEventListener('pointermove', (event) => {
    if (dragging) {
      world.x += event.clientX - last.x;
      world.y += event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
    }
  }, { signal: session.signal });
  globalThis.addEventListener('pointerup', () => { dragging = false; }, { signal: session.signal });
  app.canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    world.scale.set(Math.max(0.4, Math.min(2, world.scale.x * (event.deltaY < 0 ? 1.1 : 0.9))));
  }, { passive: false, signal: session.signal });
  tileInfo.textContent = JSON.stringify({ profile: pack.profile, renderer: 'PixiAssetLoader', source: 'runtime/manifest.json' }, null, 2);
}

async function renderGame(session: RouteSession) {
  host.append(hero('Collection sandbox', 'A tiny game, not a tower defense.', 'Move a Chikn around FarmLand, collect golden eggs, trigger a scale-pop effect, and cross the gate to change scene. Keyboard, touch, and gamepad are supported.'));
  const { stage, app } = await createStage(session);
  if (session.isStale) return;
  host.append(stage);

  const help = element('div', 'game-help');
  const score = element('strong');
  score.id = 'score';
  score.textContent = 'Eggs 0 / 5';
  help.append('Move: WASD / arrows / gamepad · tap a destination', element('br'), score);
  stage.append(help);

  const farmland = catalog.assets.filter((asset) => asset.group === 'farmland' && !asset.id.includes('overlay')).slice(0, 12);
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 6; x += 1) {
    const tile = await loadSprite(farmland[(x + y) % farmland.length]!);
    if (session.isStale) { tile.destroy(); return; }
    tile.width = 128;
    tile.height = 128;
    tile.position.set(380 + (x - y) * 64, 95 + (x + y) * 32);
    app.stage.addChild(tile);
  }
  const bird = await loadSprite(catalog.assets.find((asset) => asset.aliases.includes('chikn-flat/admiral')) ?? catalog.assets.find((asset) => asset.aliases.some((alias) => alias.startsWith('chikn-flat/')))!);
  if (session.isStale) { bird.destroy(); return; }
  bird.scale.set(Math.min(100 / bird.width, 100 / bird.height));
  bird.position.set(380, 280);
  app.stage.addChild(bird);

  const eggs: Graphics[] = [];
  for (let index = 0; index < 5; index += 1) {
    const egg = new Graphics().ellipse(0, 0, 10, 14).fill('#ffbf47').stroke({ color: '#fff0b0', width: 2 });
    egg.position.set(180 + Math.random() * 400, 180 + Math.random() * 260);
    app.stage.addChild(egg);
    eggs.push(egg);
  }
  const gate = new Text({ text: 'NEXT FARM →', style: { fill: '#ffbf47', fontSize: 18, fontWeight: '800' } });
  gate.position.set(610, 510);
  app.stage.addChild(gate);

  const keys = new Set<string>();
  addEventListener('keydown', (event) => keys.add(event.code), { signal: session.signal });
  addEventListener('keyup', (event) => keys.delete(event.code), { signal: session.signal });
  let target: { x: number; y: number } | undefined;
  let points = 0;
  let pop = 0;
  app.canvas.addEventListener('pointerdown', (event) => {
    const rect = app.canvas.getBoundingClientRect();
    target = { x: (event.clientX - rect.left) * app.screen.width / rect.width, y: (event.clientY - rect.top) * app.screen.height / rect.height };
  }, { signal: session.signal });
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    const pad = navigator.getGamepads?.()[0];
    let dx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + (pad?.axes[0] ?? 0);
    let dy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + (pad?.axes[1] ?? 0);
    if (target) {
      const tx = target.x - bird.x;
      const ty = target.y - bird.y;
      const distance = Math.hypot(tx, ty);
      if (distance > 5) { dx = tx / distance; dy = ty / distance; } else target = undefined;
    }
    const length = Math.hypot(dx, dy) || 1;
    bird.x = Math.max(40, Math.min(720, bird.x + dx / length * 180 * dt));
    bird.y = Math.max(80, Math.min(520, bird.y + dy / length * 180 * dt));
    for (const egg of [...eggs]) if (Math.hypot(egg.x - bird.x, egg.y - bird.y) < 38) {
      egg.destroy();
      eggs.splice(eggs.indexOf(egg), 1);
      points += 1;
      pop = 0.2;
      score.textContent = `Eggs ${points} / 5`;
    }
    if (pop > 0) {
      pop -= dt;
      bird.scale.set(Math.min(100 / bird.texture.width, 100 / bird.texture.height) * (1 + Math.sin(pop / 0.2 * Math.PI) * 0.25));
    }
    if (bird.x > 600 && bird.y > 470 && points === 5) {
      bird.position.set(140, 180);
      points = 0;
      score.textContent = 'New farm · Eggs 0 / 5';
    }
  });
}

function downloadJson(name: string, value: unknown) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function downloadCanvas(name: string, canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode PNG')), 'image/png'));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function animationSheetDescriptor(recipe: CharacterRecipeV1, durationMs: number) {
  if (!recipe.animationId) throw new Error('Choose an animation before exporting a sheet');
  const frameCount = 12;
  const columns = 4;
  const rows = Math.ceil(frameCount / columns);
  const frameWidth = 380;
  const frameHeight = 280;
  const stem = `${recipe.species}-${recipe.animationId.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  const frames = Array.from({ length: frameCount }, (_, index) => ({
    index,
    timeMs: Math.round(durationMs * index / (frameCount - 1)),
    x: index % columns * frameWidth,
    y: Math.floor(index / columns) * frameHeight,
    width: frameWidth,
    height: frameHeight,
  }));
  return {
    stem,
    metadata: {
      schema: 'roost2d.sprite-sheet/v1',
      image: `${stem}.png`,
      frameWidth,
      frameHeight,
      frameCount,
      columns,
      rows,
      durationMs,
      recipe,
      frames,
    },
  };
}

async function exportAnimationSheet(app: Application, rig: RigRuntime, recipe: CharacterRecipeV1, durationMs: number) {
  const { stem, metadata } = animationSheetDescriptor(recipe, durationMs);
  const sheet = document.createElement('canvas');
  sheet.width = metadata.columns * metadata.frameWidth;
  sheet.height = metadata.rows * metadata.frameHeight;
  const context = sheet.getContext('2d');
  if (!context) throw new Error('Canvas 2D export is unavailable');
  context.imageSmoothingEnabled = true;

  rig.stop('base');
  rig.play(recipe.animationId!, { layer: 'base', repeat: 0 });
  for (const frame of metadata.frames) {
    rig.seek(frame.timeMs, 'base');
    app.render();
    context.drawImage(app.canvas, 0, 0, app.canvas.width, app.canvas.height, frame.x, frame.y, frame.width, frame.height);
  }

  await downloadCanvas(`${stem}.png`, sheet);
}

// Start only after every module-scoped template/helper constant has initialized. Calling render
// above RIGHTS_ROWS would put the default showcase route in the temporal dead zone.
window.addEventListener('hashchange', () => void render());
void render();
