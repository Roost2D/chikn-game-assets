import { Application, Graphics } from 'pixi.js';
import { loadChiknPack, loadCoqfightCatalog, loadCoqfightCharacter, type CoqfightCharacterRecipeV1, type CoqfightSpecies, type LoadedCoqfightCharacter } from '@chikn-game-assets/runtime';
import { AssetManifestResolver, LazyAssetLoader } from '@roost2d/assets';
import { PixiAssetLoader, PixiRigFactory } from '@roost2d/pixi';
import { RigRuntime, type RigAnimationHandle } from '@roost2d/rig2d';
import type { AnimationClipV2, RigDefinitionV2 } from '@roost2d/contracts';
import type { RouteSession } from './lifecycle';

const STORAGE = 'chikn.coqfight-character.v1';
const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => { const node = document.createElement(tag); if (text) node.textContent = text; return node; };
interface PreviewBounds { x: number; y: number; width: number; height: number }

/** Fit changes once per selected clip, never while it is playing or disappearing. */
function measureClip(rig: RigRuntime<RigDefinitionV2>, factory: PixiRigFactory, clip: AnimationClipV2, neutral?: PreviewBounds): PreviewBounds {
  let minX = neutral?.x ?? Infinity, minY = neutral?.y ?? Infinity;
  let maxX = neutral ? neutral.x + neutral.width : -Infinity, maxY = neutral ? neutral.y + neutral.height : -Infinity;
  const times = new Set([...Array.from({ length: 33 }, (_, i) => clip.durationMs * i / 32), ...clip.channels.flatMap((channel) => channel.keyframes.map(({ timeMs }) => timeMs))]);
  rig.resetPose();
  const handle = rig.play(clip, { controlled: true, repeat: 0 });
  try {
    for (const time of [...times].sort((a, b) => a - b)) {
      handle.sample(time);
      const b = factory.root.getLocalBounds();
      if (b.width <= 0 || b.height <= 0 || ![b.x, b.y, b.width, b.height].every(Number.isFinite)) continue;
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
    }
  } finally { handle.kill(); rig.resetPose(); }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Independent official preview; authored recipes and action clocks retain their own controls/storage. */
export async function renderCoqfightPreview(host: HTMLElement, session: RouteSession): Promise<void> {
  const heading = make('section'); heading.className = 'hero';
  heading.append(make('h1', 'Official Coqfight animations'), make('p', 'Preview the current pinned Chikn and Roostr animation set, including the newly supplied movement clips.'));
  const licence = make('a', 'Chikn asset licence'); licence.href = './data/runtime/coqfight-v1/LICENSE.md'; licence.target = '_blank'; licence.rel = 'noopener'; heading.append(licence);
  const layout = make('div'); layout.className = 'workspace';
  const panel = make('section'); panel.className = 'panel';
  const stage = make('div'); stage.className = 'stage rig-stage coqfight-stage';
  const species = make('select'); species.setAttribute('aria-label', 'Official species'); species.append(new Option('Chikn', 'chikn'), new Option('Roostr', 'roostr'));
  const body = make('select'); body.setAttribute('aria-label', 'Official body');
  const traits = make('select'); traits.multiple = true; traits.size = 9; traits.setAttribute('aria-label', 'Official traits');
  const animation = make('select'); animation.setAttribute('aria-label', 'Official animation');
  const status = make('p', 'Loading the pinned official catalog…'); status.setAttribute('role', 'status');
  const pause = make('button', 'Pause'); const replay = make('button', 'Replay'); const retry = make('button', 'Retry');
  const exportRecipe = make('button', 'Export official recipe');
  const speed = make('input'); Object.assign(speed, { type: 'range', min: '.1', max: '2', step: '.1', value: '1' }); speed.setAttribute('aria-label', 'Official playback speed');
  const loop = make('input'); loop.type = 'checkbox'; loop.setAttribute('aria-label', 'Loop official animation');
  const bounds = make('input'); bounds.type = 'checkbox'; bounds.setAttribute('aria-label', 'Show official bounds');
  const mirror = make('input'); mirror.type = 'checkbox'; mirror.setAttribute('aria-label', 'Mirror official character');
  const approach = make('input'); approach.type = 'checkbox'; approach.setAttribute('aria-label', 'Preview approach motion');
  const progress = make('input'); Object.assign(progress, { type: 'range', min: '0', max: '1', step: '1', value: '0' }); progress.setAttribute('aria-label', 'Official animation time');
  const label = (text: string, control: HTMLElement) => { const field = make('label', text); field.className = 'field'; field.append(control); return field; };
  panel.append(label('Species', species), label('Body', body), label('Traits (one per occupied slot)', traits), label('Animation', animation), label('Speed', speed), label('Time', progress), label('Loop', loop), label('Mirror', mirror), label('Show bounds', bounds), label('Approach motion (presentation only)', approach), pause, replay, retry, exportRecipe, status);
  layout.append(panel, stage); host.append(heading, layout);
  let saved: Partial<CoqfightCharacterRecipeV1> = {};
  try { const candidate = JSON.parse(localStorage.getItem(STORAGE) ?? 'null'); if (candidate?.schema === 'chikn.coqfight-character/v1' && candidate.setId === 'coqfight-v1') saved = candidate; } catch { /* A malformed saved recipe never prevents opening the builder. */ }
  species.value = saved.species === 'roostr' ? 'roostr' : 'chikn'; mirror.checked = saved.mirrored === true;
  let app: Application | undefined;
  let generation = 0;
  let traitOrder: string[] = [];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current: { rig: RigRuntime<RigDefinitionV2>; factory: PixiRigFactory; textures: PixiAssetLoader; character: LoadedCoqfightCharacter; handle?: RigAnimationHandle; x: number; scale: number; bounds: PreviewBounds; neutralBounds: PreviewBounds; clipBounds: Map<string, PreviewBounds> } | undefined;
  let playing = !motion.matches;
  pause.textContent = playing ? 'Pause' : 'Play';
  let visible = true;
  const overlay = new Graphics();
  const dispose = () => { const old = current; current = undefined; old?.handle?.kill(); old?.rig.dispose(); old?.factory.destroyRoot(); if (old) void old.textures.clear(); };
  session.onTeardown(() => { generation += 1; dispose(); app?.destroy(true, { children: true, texture: false, textureSource: false }); });
  const requestedRecipe = (): CoqfightCharacterRecipeV1 => ({ schema: 'chikn.coqfight-character/v1', setId: 'coqfight-v1', species: species.value as CoqfightSpecies, bodySkinId: body.value, traitSkinIds: [...traitOrder], animationName: animation.value, mirrored: mirror.checked });
  const committedRecipe = (): CoqfightCharacterRecipeV1 | undefined => current ? { ...current.character.recipe, traitSkinIds: [...current.character.recipe.traitSkinIds], mirrored: mirror.checked, renderScale: current.scale } : undefined;
  const remember = () => { const recipe = committedRecipe(); if (recipe) try { localStorage.setItem(STORAGE, JSON.stringify(recipe)); } catch { /* Preview remains usable when storage is unavailable. */ } };
  const position = () => {
    if (!app || !current) return;
    const width = Math.max(1, stage.clientWidth); const height = Math.max(1, stage.clientHeight);
    app.renderer.resize(width, height);
    const b = current.bounds;
    const feetY = current.neutralBounds.y + current.neutralBounds.height;
    const belowFeet = Math.max(0, b.y + b.height - feetY);
    const scale = Math.min(width * .68 / Math.max(1, b.width), height * .76 / Math.max(1, feetY - b.y), belowFeet > 0 ? height * .08 / belowFeet : Infinity);
    current.scale = scale; current.x = width / 2 - (b.x + b.width / 2) * scale;
    current.factory.root.position.set(current.x, height * .89 - feetY * scale);
    current.factory.root.scale.set(mirror.checked ? -scale : scale, scale);
    if (mirror.checked) current.factory.root.x = width / 2 + (b.x + b.width / 2) * scale;
    current.x = current.factory.root.x;
  };
  const resize = new ResizeObserver(position); resize.observe(stage); session.onTeardown(() => resize.disconnect());
  const visibility = () => { if (app) { if (visible && !document.hidden) app.start(); else app.stop(); } };
  const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; visibility(); }); observer.observe(stage); session.onTeardown(() => observer.disconnect());
  document.addEventListener('visibilitychange', visibility, { signal: session.signal });
  motion.addEventListener('change', () => { playing = !motion.matches; pause.textContent = playing ? 'Pause' : 'Play'; current?.handle?.sample(0); }, { signal: session.signal });
  const frameClip = (clip: AnimationClipV2) => {
    if (!current) return;
    let b = current.clipBounds.get(clip.id);
    if (!b) { b = measureClip(current.rig, current.factory, clip, current.neutralBounds); current.clipBounds.set(clip.id, b); }
    const paddingX = b.width * .035, paddingY = b.height * .035;
    const curves = current.character.metadata.animationMeta[current.character.recipe.animationName]?.scriptCurves?.root?.RelativeX;
    const approachMargin = approach.checked ? current.neutralBounds.width * .55 * Math.max(0, ...(curves ?? []).map(({ value }) => Math.abs(value))) : 0;
    current.bounds = { x: b.x - paddingX - approachMargin, y: b.y - paddingY, width: b.width + 2 * (paddingX + approachMargin), height: b.height + 2 * paddingY };
    position();
  };
  const begin = () => {
    if (!current) return;
    const clip = current.character.clips.find(({ id }) => id === `coqfight-v1.${current!.character.recipe.species}.${animation.value}`);
    if (!clip) return;
    current.handle?.kill(); current.rig.resetPose();
    current.character.recipe.animationName = animation.value;
    frameClip(clip);
    current.handle = current.rig.play(clip, { controlled: true, repeat: loop.checked ? -1 : 0 });
    progress.max = String(clip.durationMs); progress.value = '0';
    current.factory.root.x = current.x;
    remember();
  };
  const refresh = async () => {
    const token = ++generation; status.textContent = 'Loading verified selected attachments…';
    const selection = requestedRecipe();
    let textures: PixiAssetLoader | undefined;
    let pendingFactory: PixiRigFactory | undefined;
    let pendingRig: RigRuntime<RigDefinitionV2> | undefined;
    try {
      const baseUrl = new URL('./data/', document.baseURI);
      const pack = await loadChiknPack({ baseUrl });
      const character = await loadCoqfightCharacter({ pack, recipe: selection, signal: session.signal });
      const resolver = new AssetManifestResolver(pack.manifest, { baseUrl, profile: pack.profile });
      textures = new PixiAssetLoader(resolver, new LazyAssetLoader(resolver));
      const entries = await Promise.all(character.assetIds.map(async (id) => [id, await textures!.load(id)] as const));
      if (session.isStale || token !== generation) { await textures.clear(); return; }
      if (!app) {
        const created = new Application();
        await created.init({ width: 760, height: 560, background: '#18150f', antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
        if (session.isStale || token !== generation) { created.destroy(true, { children: true, texture: false }); await textures.clear(); return; }
        app = created; stage.append(created.canvas); app.stage.addChild(overlay);
        app.ticker.add((ticker) => {
          if (!current) return;
          if (playing && visible && !document.hidden) current.handle?.advance(Math.min(100, ticker.deltaMS) * Number(speed.value));
          const clip = current.character.clips.find(({ id }) => id.endsWith(`.${animation.value}`));
          const elapsed = current.handle?.elapsedMs ?? 0;
          progress.value = String(loop.checked && clip ? elapsed % clip.durationMs : elapsed);
          let offset = 0;
          const curves = current.character.metadata.animationMeta[animation.value]?.scriptCurves?.root?.RelativeX;
          if (approach.checked && curves?.length && clip) {
            const time = (loop.checked ? elapsed % clip.durationMs : elapsed) / 1000;
            let before = curves[0]!, after = curves.at(-1)!;
            for (let i = 1; i < curves.length; i += 1) if (curves[i]!.time >= time) { before = curves[i - 1]!; after = curves[i]!; break; }
            const t = after.time === before.time ? 0 : Math.max(0, Math.min(1, (time - before.time) / (after.time - before.time)));
            offset = (before.value + (after.value - before.value) * t) * current.neutralBounds.width * .55 * current.scale * (mirror.checked ? -1 : 1);
          }
          current.factory.root.x = current.x + offset;
          overlay.clear();
          if (bounds.checked) { const b = current.factory.root.getBounds(); overlay.rect(b.x, b.y, b.width, b.height).stroke({ color: 0xf7c54a, width: 1 }); }
        });
      }
      const factory = pendingFactory = new PixiRigFactory(new Map(entries));
      const rig = pendingRig = new RigRuntime(character.definition, factory, character.clips);
      // Neutral feet establish the floor, while each selected clip contributes its complete
      // sampled extent (including elongated attacks) without resizing during playback.
      const idle = character.clips.find((clip) => clip.id.endsWith('.Idle'))!;
      const setupBounds = measureClip(rig, factory, idle);
      dispose();
      app.stage.addChildAt(factory.root, 0);
      current = { rig, factory, textures, character, x: 0, scale: 1, bounds: setupBounds, neutralBounds: setupBounds, clipBounds: new Map([[idle.id, setupBounds]]) };
      traitOrder = [...character.recipe.traitSkinIds];
      for (const option of traits.options) option.selected = traitOrder.includes(option.value);
      pendingFactory = undefined; pendingRig = undefined;
      position(); visibility();
      begin();
      status.textContent = `${character.assetIds.length} selected textures · ${character.clips.length} official clips. Source metadata is preserved. Combat clips play once; idle and movement clips use their declared defaults. Sounds and particles are separate.`;
    } catch (error) {
      pendingRig?.dispose(); pendingFactory?.destroyRoot();
      await textures?.clear();
      if (!session.isStale && token === generation) status.textContent = error instanceof Error ? error.message : String(error);
    }
  };
  const populate = async () => {
    const token = ++generation;
    try {
      const pack = await loadChiknPack({ baseUrl: new URL('./data/', document.baseURI) });
      const catalog = await loadCoqfightCatalog({ pack, signal: session.signal });
      if (session.isStale || token !== generation) return;
      const options = catalog.species[species.value as CoqfightSpecies];
      body.replaceChildren(...options.bodySkinIds.map((id) => new Option(id, id)));
      body.value = options.bodySkinIds.includes(saved.bodySkinId ?? '') ? saved.bodySkinId! : 'Bullion';
      traits.replaceChildren(...options.traitSkinIds.map((id) => new Option(id.replace(/^trait\//, ''), id, false, saved.traitSkinIds?.includes(id))));
      traitOrder = (saved.traitSkinIds ?? []).filter((id) => options.traitSkinIds.includes(id));
      animation.replaceChildren(...catalog.animationNames.map((name) => new Option(name, name)));
      const savedAnimation = saved.animationName === 'Run' && catalog.animationNames.includes('Run_Slow') ? 'Run_Slow' : saved.animationName;
      animation.value = catalog.animationNames.includes(savedAnimation ?? '') ? savedAnimation! : 'Idle';
      loop.checked = ['Idle', 'IdleHurt', 'Walk', 'Run_Slow', 'Run_Fast', 'Victory', 'Flap'].includes(animation.value);
      await refresh();
    } catch (error) { if (!session.isStale && token === generation) status.textContent = error instanceof Error ? error.message : String(error); }
  };
  const listen = (target: HTMLElement, event: string, action: () => void) => target.addEventListener(event, action, { signal: session.signal });
  listen(species, 'change', () => { saved = {}; void populate(); });
  listen(body, 'change', () => void refresh());
  listen(traits, 'change', () => {
    const selected = [...traits.selectedOptions].map((option) => option.value);
    traitOrder = [...traitOrder.filter((id) => selected.includes(id)), ...selected.filter((id) => !traitOrder.includes(id))];
    void refresh();
  });
  listen(animation, 'change', () => { loop.checked = current?.character.clips.find((clip) => clip.id.endsWith(`.${animation.value}`))?.loop === true; begin(); });
  listen(loop, 'change', begin); listen(replay, 'click', begin); listen(retry, 'click', () => void populate());
  listen(pause, 'click', () => { playing = !playing; pause.textContent = playing ? 'Pause' : 'Play'; });
  listen(progress, 'input', () => { current?.handle?.sample(Number(progress.value)); });
  listen(mirror, 'change', () => { position(); remember(); });
  listen(approach, 'change', () => {
    const clip = current?.character.clips.find(({ id }) => id === `coqfight-v1.${current!.character.recipe.species}.${current!.character.recipe.animationName}`);
    if (clip) frameClip(clip);
  });
  listen(exportRecipe, 'click', () => {
    const recipe = committedRecipe(); if (!recipe) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(recipe, null, 2) + '\n'], { type: 'application/json' }));
    const anchor = make('a'); anchor.href = url; anchor.download = 'coqfight-character.json'; anchor.click(); URL.revokeObjectURL(url);
  });
  await populate();
}
