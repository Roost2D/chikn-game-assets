import { Application, type Texture } from 'pixi.js';
import { loadChiknPack } from '@chikn-game-assets/runtime';
import { AssetManifestResolver, LazyAssetLoader } from '@roost2d/assets';
import { applyCharacterRecipe, CHARACTER_RECIPE_SCHEMA, loadChiknRig, loadRoostrRig, loadChiknAnimations, loadRoostrAnimations, type CharacterRecipeV1 } from '@roost2d/chikn-rigs';
import { PixiAssetLoader, PixiRigFactory } from '@roost2d/pixi';
import { RigRuntime } from '@roost2d/rig2d';
import type { RigDefinitionV1 } from '@roost2d/contracts';
import references from '../../../config/trait-review-references.json';
import feedback from '../../../config/trait-review-feedback.json';
import './trait-review.css';
declare const __ASSEMBLY_CANDIDATE__: boolean;

const host = document.querySelector<HTMLElement>('#review')!;
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const value = document.createElement(tag);
  if (text) value.textContent = text;
  return value;
}
function select(label: string, options: [string, string][]) {
  const field = node('label', label);
  const input = node('select'); input.setAttribute('aria-label', label);
  input.append(...options.map(([value, text]) => new Option(text, value)));
  field.append(input); return { field, input };
}
host.append(node('h1', 'Chikn + Roostr V2 assembly review'), node('p', 'Compare the shared game rig with the Chikn V2 / Roostr V2 visuals used in Roost Rift. Inspect every trait, skin and facing before approving a library release.'));
host.append(node('p', __ASSEMBLY_CANDIDATE__ ? 'LOCAL LIBRARY CANDIDATE · isolated checkout' : 'INSTALLED LIBRARY'));
const back = node('a', 'Open character builder'); back.href = './#builder'; host.append(back);
const controls = node('form'); controls.addEventListener('submit', event => event.preventDefault());
const species = select('Species', [['chikn', 'Chikn'], ['roostr', 'Roostr']]);
const mode = select('Preview set', [['traits', 'Every trait'], ['latest', 'Latest corrections'], ['coats', 'Coats and breastplates'], ['feedback', 'Your feedback · V2 visual comparisons'], ['outfits', 'Complete outfits · every trait covered'], ['references', 'Official V2 visual comparisons']]);
const skin = select('Skin', []);
const category = select('Category', [['all', 'All categories'], ...['Head','Neck','Torso','Feet','Tail'].map(value => [value, value] as [string,string])]);
const pose = select('Pose', [['setup', 'Setup'], ['walk', 'Walk · 25%'], ['fly', 'Fly · 25%'], ['attack', 'Attack · 50%'], ['hit', 'Hit · 50%']]);
const profile = select('Asset profile', [['high', 'High'], ['default', 'Default']]);
const facing = select('Facing', [['right', 'Right'], ['left', 'Left']]);
const search = node('input'); search.type = 'search'; search.placeholder = 'Find a trait or token'; search.setAttribute('aria-label', 'Find a trait or token');
const query = new URLSearchParams(location.search);
if (['feedback','latest','coats'].includes(query.get('review') ?? '')) mode.input.value = query.get('review')!;
if (query.get('species') === 'roostr') species.input.value = 'roostr';
if (query.get('trait')) search.value = query.get('trait')!;
controls.append(...[species, mode, skin, category, pose, profile, facing].map(control => control.field), search);
host.append(controls);
const status = node('p', 'Loading…'); status.role = 'status'; host.append(status);
host.append(node('p', 'Latest corrections cover hair, sneakers, the perched jockey, PermaBull and garment layers. Coats and breastplates cover the front wing and leg branches; held props remain behind the wing. The earlier 95-trait feedback set remains available. The owner authorized library release with the general coat-leg correction on 1 November 2026.'));
host.append(node('p', `V2 references: ${references.references.length} visuals cover 273 / 276 trait groups and all 19 base skins, using Chikn V2 build1 and Roostr V2 build3. No matching live label: Chikn Polygon Bling / Polygon Degen; Roostr MFD. Those traits remain in the complete gallery.`));
const gallery = node('section'); gallery.className = 'gallery'; host.append(gallery);
const legal = node('p', 'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm.'); host.append(legal);
const app = new Application(); await app.init({ width: 360, height: 320, backgroundAlpha: 0, antialias: true, autoStart: false });
let generation = 0;
let loader: PixiAssetLoader | undefined;
let definition: RigDefinitionV1;
let clips: Awaited<ReturnType<typeof loadChiknAnimations>>;
let textures = new Map<string, Texture>();
let resourceKey = '';

async function render() {
  const current = ++generation;
  const key = `${species.input.value}/${profile.input.value}`;
  controls.setAttribute('aria-busy', 'true'); status.textContent = 'Loading assembly textures…';
  for (const control of controls.querySelectorAll('input,select')) (control as HTMLInputElement).disabled = true;
  try {
    if (key !== resourceKey) {
      // Resource changes are serialized by disabling their controls while loading.
      species.input.disabled = profile.input.disabled = true;
      await loader?.clear();
      const s = species.input.value;
      [definition, clips] = await Promise.all([s === 'chikn' ? loadChiknRig() : loadRoostrRig(), s === 'chikn' ? loadChiknAnimations() : loadRoostrAnimations()]);
      const pack = await loadChiknPack({ baseUrl: new URL('./data/', location.href), profile: profile.input.value as 'high' | 'default' });
      const resolver = new AssetManifestResolver(pack.manifest, { baseUrl: new URL('./data/', location.href), profile: pack.profile });
      loader = new PixiAssetLoader(resolver, new LazyAssetLoader(resolver));
      const ids = [...new Set(definition.attachments.map(a => a.texture.assetId))];
      textures = new Map(await Promise.all(ids.map(async id => [id, await loader!.load(id)] as const)));
      skin.input.replaceChildren(...Object.keys(definition.skins ?? {}).map(id => new Option(id, id)));
      resourceKey = key;
    }
    if (current !== generation) return;
    gallery.replaceChildren();
    const groups = Object.values(definition.attachmentGroups ?? {});
    const s = species.input.value as 'chikn' | 'roostr';
    const base: CharacterRecipeV1 = { schema: CHARACTER_RECIPE_SCHEMA, species: s, skinId: skin.input.value, traitGroupIds: [], mirrored: facing.input.value === 'left' };
    const rows: { id: string; title: string; recipe: CharacterRecipeV1; imageUrl?: string; referenceUrl?: string }[] = [];
    if (['feedback','latest','coats'].includes(mode.input.value)) {
      const ids = mode.input.value === 'latest' ? feedback.latestCorrections[s]
        : mode.input.value === 'coats' ? feedback.coatLikeTraits[s]
        : Object.entries(feedback[s]).flatMap(([categoryName, names]) => names.map(name => `${categoryName}/${name}`));
      for (const id of ids) {
          const ref = references.references.find(ref => ref.species === s && ref.traitGroupIds.includes(id));
          if (!definition.attachmentGroups?.[id]) throw new Error(`Feedback trait is unavailable: ${s}/${id}`);
          rows.push({ id, title: ref ? `${id} · #${ref.token}` : `${id} · no live V2 match`, recipe: ref ? { ...base, skinId: ref.skinId, traitGroupIds: ref.traitGroupIds } : { ...base, traitGroupIds: [id] }, imageUrl: ref?.imageUrl, referenceUrl: ref?.referenceUrl });
      }
    } else if (mode.input.value === 'references') {
      for (const ref of references.references.filter(ref => ref.species === s)) rows.push({ id: `${s}/${ref.token}`, title: `#${ref.token} · ${ref.skinId}`, recipe: { ...base, skinId: ref.skinId, traitGroupIds: ref.traitGroupIds }, imageUrl: ref.imageUrl, referenceUrl: ref.referenceUrl });
    } else if (mode.input.value === 'outfits') {
      const categories = [...new Set(groups.map(g => String(g.metadata?.category)))].map(c => groups.filter(g => g.metadata?.category === c));
      for (let i = 0; i < Math.max(...categories.map(c => c.length)); i++) rows.push({ id: `outfit/${i + 1}`, title: `Outfit ${i + 1}`, recipe: { ...base, traitGroupIds: categories.map(c => c[i % c.length]!.id) } });
    } else {
      rows.push({ id: 'base', title: 'Base skin', recipe: base });
      for (const group of groups.filter(g => category.input.value === 'all' || g.metadata?.category === category.input.value)) rows.push({ id: group.id, title: group.id, recipe: { ...base, traitGroupIds: [group.id] } });
    }
    const query = search.value.toLowerCase().trim();
    const filtered = rows.filter(row => `${row.title} ${row.recipe.traitGroupIds.join(' ')}`.toLowerCase().includes(query) && (!['feedback','latest','coats'].includes(mode.input.value) || category.input.value === 'all' || row.id.startsWith(category.input.value.toLowerCase() + '/')));
    // One live rig is reused for the entire gallery; images survive GPU resource teardown.
    const factory = new PixiRigFactory(textures);
    const rig = new RigRuntime(definition, factory, clips);
    try {
      for (let index = 0; index < filtered.length; index++) {
        if (current !== generation) return;
        const row = filtered[index]!;
        applyCharacterRecipe(rig, row.recipe, definition, clips);
        if (pose.input.value !== 'setup') {
          const clip = clips.find(clip => clip.id === `${s}.${pose.input.value}`)!;
          rig.play(clip, { controlled: true }).sample(clip.durationMs * (['attack','hit'].includes(pose.input.value) ? 0.5 : 0.25));
        }
        const root = factory.root;
        root.position.set(0); root.pivot.set(0); root.scale.set(1);
        const bounds = root.getLocalBounds();
        const scale = Math.min(1.6, 330 / Math.max(1, bounds.width), 286 / Math.max(1, bounds.height));
        root.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        root.position.set(180, 160); root.scale.set(scale);
        app.stage.addChild(root); app.render();
        const article = node('article'); article.dataset.id = row.id;
        article.append(node('h2', row.title));
        const images = node('div'); images.className = 'images';
        const preview = node('img'); preview.alt = `${s} ${row.title} assembled`; preview.src = await app.renderer.extract.base64({ target: app.stage, format: 'png' });
        images.append(preview);
        if (row.imageUrl) { const reference = node('img'); reference.src = row.imageUrl; reference.alt = 'Official V2 visual reference'; reference.loading = 'lazy'; images.append(reference); }
        article.append(images, node('p', `${row.recipe.skinId} · ${pose.input.value} · ${facing.input.value}`), node('p', row.recipe.traitGroupIds.join(' · ') || 'No traits'));
        const details = node('details'); details.append(node('summary', 'Recipe and visible parts'), node('pre', JSON.stringify({ ...row.recipe, baseSlotAttachments: definition.skins?.[row.recipe.skinId], activeAttachments: rig.activeAttachmentIds() }, null, 2))); article.append(details);
        if (row.referenceUrl) { const link = node('a', 'V2 source image'); link.href = row.referenceUrl; link.target = '_blank'; link.rel = 'noopener'; article.append(link); }
        gallery.append(article);
        status.textContent = `Rendering ${index + 1} / ${filtered.length} complete birds…`;
        if (index % 8 === 0) await new Promise(requestAnimationFrame);
      }
    } finally { rig.dispose(); factory.destroyRoot(); }
    if (current === generation) status.textContent = `Ready · ${filtered.length} previews · ${groups.length} available traits · ${Object.keys(definition.skins ?? {}).length} skins · ${profile.input.value} profile`;
  } catch (error) { if (current === generation) status.textContent = `Failed: ${error instanceof Error ? error.message : String(error)}`; }
  finally { if (current === generation) { controls.removeAttribute('aria-busy'); for (const control of controls.querySelectorAll('input,select')) (control as HTMLInputElement).disabled = false; } }
}
for (const control of [species, mode, skin, category, pose, profile, facing]) control.input.addEventListener('change', () => void render());
search.addEventListener('change', () => void render());
window.addEventListener('pagehide', () => { generation++; app.destroy(true, { children: true }); void loader?.clear(); });
await render();
