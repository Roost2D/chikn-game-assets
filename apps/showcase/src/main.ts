import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import './style.css';

interface CatalogAsset {
  id: string;
  group: string;
  thumbnail: string;
  width: number;
  height: number;
  sourcePaths: string[];
  license: string;
  ownership: string;
  hostingAuthorized: boolean;
  communityUseAuthorized: boolean;
  sublicenseGrantedByRepository: false;
  commercialUse: string;
}

interface Catalog {
  schema: string;
  version: string;
  totals: { assets: number };
  assets: CatalogAsset[];
}

const host = document.querySelector<HTMLElement>('#app')!;
const catalog = await fetch('./data/catalog.json').then((response) => {
  if (!response.ok) throw new Error(`Catalog ${response.status}`);
  return response.json() as Promise<Catalog>;
});
const routes = ['showcase', 'builder', 'farmland', 'game'] as const;
type Route = typeof routes[number];

window.addEventListener('hashchange', render);
void render();

async function render() {
  const route = (routes.includes(location.hash.slice(1) as Route) ? location.hash.slice(1) : 'showcase') as Route;
  document.querySelectorAll('nav a').forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${route}`));
  host.replaceChildren();
  if (route === 'showcase') renderShowcase();
  if (route === 'builder') await renderBuilder();
  if (route === 'farmland') await renderFarmland();
  if (route === 'game') await renderGame();
}

function hero(eyebrow: string, title: string, copy: string) {
  const node = document.createElement('section');
  node.className = 'hero';
  node.innerHTML = `<div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="muted">${copy}</p></div>`;
  return node;
}

function renderShowcase() {
  host.append(hero(`${catalog.totals.assets.toLocaleString()} publicly hosted assets`, 'The Chikn community art shelf.', 'Search every hosted Chikn, Roostr, rig, trait, unique character, and FarmLand runtime frame.'));
  const controls = document.createElement('div');
  controls.className = 'controls';
  const groups = [...new Set(catalog.assets.map(({ group }) => group))].sort();
  controls.innerHTML = `<input type="search" aria-label="Search assets" placeholder="Search ID or source path"><select aria-label="Asset group"><option value="">All groups</option>${groups.map((group) => `<option>${group}</option>`).join('')}</select><select aria-label="Species"><option value="">All content</option><option value="chikn">Chikn</option><option value="roostr">Roostr</option><option value="farmland">FarmLand</option></select>`;
  host.append(controls);
  const grid = document.createElement('div');
  grid.className = 'asset-grid';
  host.append(grid);
  const [search, group, species] = [...controls.querySelectorAll('input,select')] as Array<HTMLInputElement | HTMLSelectElement>;
  const update = () => {
    const query = search.value.toLowerCase();
    const visible = catalog.assets.filter((asset) => (!query || `${asset.id} ${asset.sourcePaths.join(' ')}`.toLowerCase().includes(query)) && (!group.value || asset.group === group.value) && (!species.value || asset.id.includes(species.value)));
    grid.innerHTML = visible.map((asset) => `<article class="asset-card"><img loading="lazy" src="${asset.thumbnail}" alt="${asset.id}"><div class="asset-info"><strong title="${asset.id}">${asset.id}</strong><small>${asset.width}×${asset.height} · ${asset.group}</small><dl class="rights-summary"><div><dt>Owner</dt><dd>Chikn rights-holder</dd></div><div><dt>Hosted by</dt><dd>Roost2D with permission</dd></div><div><dt>Community use</dt><dd>Non-commercial</dd></div><div><dt>Commercial use</dt><dd>Separate Chikn agreement required</dd></div><div><dt>Repository sublicense</dt><dd>None</dd></div></dl><a href="https://github.com/Roost2D/chikn-game-assets/blob/main/${asset.sourcePaths[0]}" target="_blank" rel="noreferrer">Hosted source record</a></div></article>`).join('');
  };
  controls.addEventListener('input', update);
  update();
}

async function createStage(className = 'stage') {
  const stage = document.createElement('div');
  stage.className = className;
  const app = new Application();
  await app.init({ width: 760, height: 560, background: '#18150f', antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
  stage.append(app.canvas);
  return { stage, app };
}

async function loadSprite(asset: CatalogAsset) {
  const texture = await Assets.load<Texture>(asset.thumbnail);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  return sprite;
}

async function renderBuilder() {
  host.append(hero('Character Builder', 'Assemble, animate, and export.', 'Choose a flat character, layer hosted rig or trait art, mirror, tint, scale, randomize, and export a portable non-commercial configuration.'));
  const layout = document.createElement('div');
  layout.className = 'workspace';
  const panel = document.createElement('section');
  panel.className = 'panel';
  const bodies = catalog.assets.filter((asset) => asset.group === 'chikn-flat' || asset.group === 'roostr-flat');
  const traits = catalog.assets.filter((asset) => asset.group === 'chikn-traits' || asset.group === 'roostr-traits');
  panel.innerHTML = `<div class="field"><label>Body</label><select id="body">${bodies.slice(0, 250).map((asset, index) => `<option value="${asset.id}" ${index ? '' : 'selected'}>${asset.id}</option>`).join('')}</select></div><div class="field"><label>Trait attachment</label><select id="trait"><option value="">None</option>${traits.slice(0, 350).map((asset) => `<option value="${asset.id}">${asset.id}</option>`).join('')}</select></div><div class="field"><label>Animation</label><select id="animation"><option>idle</option><option>walk</option><option>fly</option><option>attack</option><option>hit</option></select></div><div class="field"><label>Scale <output id="scale-out">1</output></label><input id="scale" type="range" min="0.5" max="1.8" step="0.05" value="1"></div><div class="field"><label>Tint</label><input id="tint" type="color" value="#ffffff"></div><button id="mirror">Mirror</button> <button id="random">Random</button> <button class="primary" id="export">Export JSON</button><pre class="config" id="config"></pre>`;
  const { stage, app } = await createStage();
  layout.append(panel, stage);
  host.append(layout);
  const root = new Container();
  root.position.set(380, 300);
  app.stage.addChild(root);
  let bodySprite: Sprite | undefined;
  let traitSprite: Sprite | undefined;
  let mirrored = false;
  let time = 0;
  const get = (id: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
  const find = (id: string) => catalog.assets.find((asset) => asset.id === id)!;
  const config = () => ({
    schema: 'chikn-game-assets.character/v1',
    contentTerms: 'CHIKN-COMMUNITY-NONCOMMERCIAL',
    repositorySublicense: false,
    body: get('body').value,
    traits: get('trait').value ? [get('trait').value] : [],
    animation: get('animation').value,
    scale: Number(get('scale').value),
    mirrored,
    tint: get('tint').value,
  });
  const refresh = async () => {
    bodySprite?.destroy();
    traitSprite?.destroy();
    bodySprite = await loadSprite(find(get('body').value));
    const fit = Math.min(340 / bodySprite.texture.width, 340 / bodySprite.texture.height);
    bodySprite.scale.set(fit);
    root.addChild(bodySprite);
    if (get('trait').value) {
      traitSprite = await loadSprite(find(get('trait').value));
      traitSprite.scale.set(Math.min(340 / traitSprite.texture.width, 340 / traitSprite.texture.height));
      root.addChild(traitSprite);
    }
    root.scale.set(Number(get('scale').value) * (mirrored ? -1 : 1), Number(get('scale').value));
    const tint = Number.parseInt(get('tint').value.slice(1), 16);
    bodySprite.tint = tint;
    if (traitSprite) traitSprite.tint = tint;
    get('scale-out').textContent = get('scale').value;
    document.querySelector('#config')!.textContent = JSON.stringify(config(), null, 2);
  };
  panel.addEventListener('change', () => void refresh());
  get('scale').addEventListener('input', () => void refresh());
  document.querySelector('#mirror')!.addEventListener('click', () => { mirrored = !mirrored; void refresh(); });
  document.querySelector('#random')!.addEventListener('click', () => {
    get('body').value = bodies[Math.floor(Math.random() * Math.min(250, bodies.length))]!.id;
    get('trait').value = Math.random() > 0.3 ? traits[Math.floor(Math.random() * Math.min(350, traits.length))]!.id : '';
    void refresh();
  });
  document.querySelector('#export')!.addEventListener('click', () => downloadJson('chikn-character.json', config()));
  app.ticker.add((ticker) => {
    time += ticker.deltaMS / 1000;
    const animation = get('animation').value;
    root.y = 300 + (animation === 'walk' ? Math.abs(Math.sin(time * 7)) * -12 : Math.sin(time * 2) * 5);
    root.rotation = animation === 'hit' ? Math.sin(time * 22) * 0.08 : animation === 'attack' ? Math.sin(time * 8) * 0.05 : 0;
  });
  await refresh();
}

async function renderFarmland() {
  host.append(hero('FarmLand Viewer', 'Compose an isometric 6×4 farm.', 'Pick hosted tiles and overlays, pan or zoom the camera, and inspect the selected logical cell.'));
  const layout = document.createElement('div');
  layout.className = 'workspace';
  const panel = document.createElement('section');
  panel.className = 'panel';
  const farmland = catalog.assets.filter((asset) => asset.group === 'farmland' && !asset.id.includes('/overlays/')).slice(0, 42);
  panel.innerHTML = `<h2>Tile palette</h2><div class="farm-list">${farmland.map((asset) => `<button title="${asset.id}" data-id="${asset.id}"><img src="${asset.thumbnail}" alt="${asset.id}"></button>`).join('')}</div><p class="muted">Wheel/pinch to zoom · drag to pan · click a diamond to select.</p><pre class="config" id="tile-info">Select a tile.</pre>`;
  const { stage, app } = await createStage();
  layout.append(panel, stage);
  host.append(layout);
  const world = new Container();
  world.position.set(380, 100);
  app.stage.addChild(world);
  let selected = farmland[0]!;
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 6; x += 1) {
    const sprite = await loadSprite(farmland[(x + y * 3) % farmland.length]!);
    sprite.width = 128;
    sprite.height = 128;
    sprite.position.set((x - y) * 64, (x + y) * 32);
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    sprite.on('pointertap', () => {
      document.querySelector('#tile-info')!.textContent = JSON.stringify({ cell: { x, y }, assetId: selected.id }, null, 2);
      void Assets.load<Texture>(selected.thumbnail).then((texture) => { sprite.texture = texture; });
    });
    world.addChild(sprite);
  }
  panel.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
    if (button) selected = catalog.assets.find((asset) => asset.id === button.dataset.id)!;
  });
  let dragging = false;
  let last = { x: 0, y: 0 };
  app.canvas.addEventListener('pointerdown', (event) => { dragging = true; last = { x: event.clientX, y: event.clientY }; });
  app.canvas.addEventListener('pointermove', (event) => {
    if (dragging) {
      world.x += event.clientX - last.x;
      world.y += event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
    }
  });
  globalThis.addEventListener('pointerup', () => { dragging = false; });
  app.canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    world.scale.set(Math.max(0.4, Math.min(2, world.scale.x * (event.deltaY < 0 ? 1.1 : 0.9))));
  }, { passive: false });
}

async function renderGame() {
  host.append(hero('Collection sandbox', 'A tiny game, not a tower defense.', 'Move a Chikn around FarmLand, collect golden eggs, trigger a scale-pop effect, and cross the gate to change scene. Keyboard, touch, and gamepad are supported.'));
  const { stage, app } = await createStage();
  host.append(stage);
  stage.insertAdjacentHTML('beforeend', '<div class="game-help">Move: WASD / arrows / gamepad · tap a destination<br><strong id="score">Eggs 0 / 5</strong></div>');
  const farmland = catalog.assets.filter((asset) => asset.group === 'farmland' && !asset.id.includes('overlay')).slice(0, 12);
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 6; x += 1) {
    const tile = await loadSprite(farmland[(x + y) % farmland.length]!);
    tile.width = 128;
    tile.height = 128;
    tile.position.set(380 + (x - y) * 64, 95 + (x + y) * 32);
    app.stage.addChild(tile);
  }
  const bird = await loadSprite(catalog.assets.find((asset) => asset.group === 'chikn-flat')!);
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
  addEventListener('keydown', (event) => keys.add(event.code));
  addEventListener('keyup', (event) => keys.delete(event.code));
  let target: { x: number; y: number } | undefined;
  let score = 0;
  let pop = 0;
  app.canvas.addEventListener('pointerdown', (event) => {
    const rect = app.canvas.getBoundingClientRect();
    target = { x: (event.clientX - rect.left) * app.screen.width / rect.width, y: (event.clientY - rect.top) * app.screen.height / rect.height };
  });
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
      score += 1;
      pop = 0.2;
      document.querySelector('#score')!.textContent = `Eggs ${score} / 5`;
    }
    if (pop > 0) {
      pop -= dt;
      bird.scale.set(Math.min(100 / bird.texture.width, 100 / bird.texture.height) * (1 + Math.sin(pop / 0.2 * Math.PI) * 0.25));
    }
    if (bird.x > 600 && bird.y > 470 && score === 5) {
      bird.position.set(140, 180);
      score = 0;
      document.querySelector('#score')!.textContent = 'New farm · Eggs 0 / 5';
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
