import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { RouteLifecycle, type RouteSession } from './lifecycle';
import './style.css';

interface CatalogAsset {
  id: string;
  aliases: string[];
  group: string;
  thumbnail: string;
  width: number;
  height: number;
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
  totals: { assets: number };
  assets: CatalogAsset[];
}

const REPOSITORY_BLOB = 'https://github.com/Roost2D/chikn-game-assets/blob/main/';
const host = document.querySelector<HTMLElement>('#app')!;
const catalog = await fetch('./data/catalog.json').then((response) => {
  if (!response.ok) throw new Error(`Catalog ${response.status}`);
  return response.json() as Promise<Catalog>;
});
const routes = ['showcase', 'builder', 'farmland', 'game'] as const;
type Route = typeof routes[number];

const lifecycle = new RouteLifecycle();

async function render() {
  const session = lifecycle.begin();
  const route = (routes.includes(location.hash.slice(1) as Route) ? location.hash.slice(1) : 'showcase') as Route;
  document.querySelectorAll('nav a').forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${route}`));
  host.replaceChildren();
  if (route === 'showcase') renderShowcase();
  if (route === 'builder') await renderBuilder(session);
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
  host.append(hero(`${catalog.totals.assets.toLocaleString()} publicly hosted assets`, 'The Chikn community art shelf.', 'Search every hosted Chikn, Roostr, rig, trait, unique character, and FarmLand runtime frame.'));

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
  for (const [label, value] of [['All content', ''], ['Chikn', 'chikn'], ['Roostr', 'roostr'], ['FarmLand', 'farmland']]) {
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
      image.src = asset.thumbnail;
      image.alt = asset.id;
      const title = card.querySelector('strong')!;
      title.textContent = asset.id;
      title.title = asset.id;
      const rights = card.querySelector('.rights-summary')!;
      for (const [term, description] of rightsRows(asset)) {
        const row = element('div');
        row.append(element('dt', undefined, term), element('dd', undefined, description));
        rights.append(row);
      }
      card.querySelector('small')!.textContent = `${asset.width}×${asset.height} · ${asset.group}`;
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
async function createStage(session: RouteSession, className = 'stage') {
  const stage = element('div', className);
  const app = new Application();
  await app.init({ width: 760, height: 560, background: '#18150f', antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
  session.onTeardown(() => app.destroy(true, { children: true, texture: false }));
  stage.append(app.canvas);
  return { stage, app };
}

async function loadSprite(asset: CatalogAsset) {
  const texture = await Assets.load<Texture>(asset.thumbnail);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  return sprite;
}

async function renderBuilder(session: RouteSession) {
  host.append(hero('Character Builder', 'Assemble, animate, and export.', 'Choose a flat character, layer hosted rig or trait art, mirror, tint, scale, randomize, and export a portable non-commercial configuration.'));
  const layout = element('div', 'workspace');
  const panel = element('section', 'panel');
  const bodies = catalog.assets.filter((asset) => asset.aliases.some((alias) => alias.startsWith('chikn-flat/') || alias.startsWith('roostr-flat/')));
  const traits = catalog.assets.filter((asset) => asset.group === 'chikn-traits' || asset.group === 'roostr-traits');

  const bodySelect = element('select');
  bodySelect.id = 'body';
  for (const asset of bodies.slice(0, 250)) bodySelect.append(new Option(asset.id, asset.id));
  if (bodySelect.options.length) bodySelect.selectedIndex = 0;

  const traitSelect = element('select');
  traitSelect.id = 'trait';
  traitSelect.append(new Option('None', ''));
  for (const asset of traits.slice(0, 350)) traitSelect.append(new Option(asset.id, asset.id));

  const animationSelect = element('select');
  animationSelect.id = 'animation';
  for (const name of ['idle', 'walk', 'fly', 'attack', 'hit']) animationSelect.append(new Option(name, name));

  const scaleOutput = element('output');
  scaleOutput.id = 'scale-out';
  scaleOutput.textContent = '1';
  const scaleInput = element('input');
  Object.assign(scaleInput, { id: 'scale', type: 'range', min: '0.5', max: '1.8', step: '0.05', value: '1' });

  const tintInput = element('input');
  Object.assign(tintInput, { id: 'tint', type: 'color', value: '#ffffff' });

  const mirrorButton = element('button', undefined, 'Mirror');
  const randomButton = element('button', undefined, 'Random');
  const exportButton = element('button', 'primary', 'Export JSON');
  const configOutput = element('pre', 'config');

  panel.append(
    field('Body', bodySelect),
    field('Trait attachment', traitSelect),
    field('Animation', animationSelect),
    field('Scale ', scaleInput, scaleOutput),
    field('Tint', tintInput),
    mirrorButton, randomButton, exportButton, configOutput,
  );

  const { stage, app } = await createStage(session);
  if (session.isStale) return;
  layout.append(panel, stage);
  host.append(layout);

  const root = new Container();
  root.position.set(380, 300);
  app.stage.addChild(root);
  let bodySprite: Sprite | undefined;
  let traitSprite: Sprite | undefined;
  let mirrored = false;
  let time = 0;
  const find = (id: string) => catalog.assets.find((asset) => asset.id === id)!;
  const config = () => ({
    schema: 'chikn-game-assets.character/v1',
    contentTerms: 'CHIKN-COMMUNITY-NONCOMMERCIAL',
    repositorySublicense: false,
    body: bodySelect.value,
    traits: traitSelect.value ? [traitSelect.value] : [],
    animation: animationSelect.value,
    scale: Number(scaleInput.value),
    mirrored,
    tint: tintInput.value,
  });
  const refresh = async () => {
    bodySprite?.destroy();
    traitSprite?.destroy();
    traitSprite = undefined;
    bodySprite = await loadSprite(find(bodySelect.value));
    if (session.isStale) { bodySprite.destroy(); return; }
    const fit = Math.min(340 / bodySprite.texture.width, 340 / bodySprite.texture.height);
    bodySprite.scale.set(fit);
    root.addChild(bodySprite);
    if (traitSelect.value) {
      traitSprite = await loadSprite(find(traitSelect.value));
      if (session.isStale) { traitSprite.destroy(); return; }
      traitSprite.scale.set(Math.min(340 / traitSprite.texture.width, 340 / traitSprite.texture.height));
      root.addChild(traitSprite);
    }
    root.scale.set(Number(scaleInput.value) * (mirrored ? -1 : 1), Number(scaleInput.value));
    const tint = Number.parseInt(tintInput.value.slice(1), 16);
    bodySprite.tint = tint;
    if (traitSprite) traitSprite.tint = tint;
    scaleOutput.textContent = scaleInput.value;
    configOutput.textContent = JSON.stringify(config(), null, 2);
  };
  panel.addEventListener('change', () => void refresh(), { signal: session.signal });
  scaleInput.addEventListener('input', () => void refresh(), { signal: session.signal });
  mirrorButton.addEventListener('click', () => { mirrored = !mirrored; void refresh(); }, { signal: session.signal });
  randomButton.addEventListener('click', () => {
    bodySelect.value = bodies[Math.floor(Math.random() * Math.min(250, bodies.length))]!.id;
    traitSelect.value = Math.random() > 0.3 ? traits[Math.floor(Math.random() * Math.min(350, traits.length))]!.id : '';
    void refresh();
  }, { signal: session.signal });
  exportButton.addEventListener('click', () => downloadJson('chikn-character.json', config()), { signal: session.signal });
  app.ticker.add((ticker) => {
    time += ticker.deltaMS / 1000;
    const animation = animationSelect.value;
    root.y = 300 + (animation === 'walk' ? Math.abs(Math.sin(time * 7)) * -12 : Math.sin(time * 2) * 5);
    root.rotation = animation === 'hit' ? Math.sin(time * 22) * 0.08 : animation === 'attack' ? Math.sin(time * 8) * 0.05 : 0;
  });
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
  host.append(hero('FarmLand Viewer', 'Compose an isometric 6×4 farm.', 'Pick hosted tiles and overlays, pan or zoom the camera, and inspect the selected logical cell.'));
  const layout = element('div', 'workspace');
  const panel = element('section', 'panel');
  const farmland = catalog.assets.filter((asset) => asset.group === 'farmland' && !asset.id.includes('/overlays/')).slice(0, 42);

  panel.append(element('h2', undefined, 'Tile palette'));
  const list = element('div', 'farm-list');
  for (const asset of farmland) {
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
  layout.append(panel, stage);
  host.append(layout);

  const world = new Container();
  world.position.set(380, 100);
  app.stage.addChild(world);
  let selected = farmland[0]!;
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 6; x += 1) {
    const sprite = await loadSprite(farmland[(x + y * 3) % farmland.length]!);
    if (session.isStale) { sprite.destroy(); return; }
    sprite.width = 128;
    sprite.height = 128;
    sprite.position.set((x - y) * 64, (x + y) * 32);
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    sprite.on('pointertap', () => {
      tileInfo.textContent = JSON.stringify({ cell: { x, y }, assetId: selected.id }, null, 2);
      void Assets.load<Texture>(selected.thumbnail).then((texture) => { if (!session.isStale) sprite.texture = texture; });
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

// Start only after every module-scoped template/helper constant has initialized. Calling render
// above RIGHTS_ROWS would put the default showcase route in the temporal dead zone.
window.addEventListener('hashchange', () => void render());
void render();
