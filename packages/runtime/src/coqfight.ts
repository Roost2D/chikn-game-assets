import type { AnimationClipV2, RigDefinitionV2 } from '@roost2d/contracts';
import { fetchAssetBytes, resolveAssetUrl, selectVariant, type FetchAssetOptions, type LoadedChiknPack } from './index.js';

export const COQFIGHT_CHARACTER_SCHEMA = 'chikn.coqfight-character/v1';
export const COQFIGHT_SET_ID = 'coqfight-v1';
export type CoqfightSpecies = 'chikn' | 'roostr';

/** Persist separately from authored CharacterRecipeV1 recipes. Names are exact upstream skin/clip names. */
export interface CoqfightCharacterRecipeV1 {
  schema: typeof COQFIGHT_CHARACTER_SCHEMA;
  setId: typeof COQFIGHT_SET_ID;
  species: CoqfightSpecies;
  bodySkinId: string;
  traitSkinIds: string[];
  animationName: string;
  mirrored?: boolean;
  renderScale?: number;
}

export interface CoqfightCatalog {
  schema: 'chikn.coqfight-catalog/v1';
  setId: typeof COQFIGHT_SET_ID;
  sourceVersion: string;
  species: Record<CoqfightSpecies, { bodySkinIds: string[]; traitSkinIds: string[] }>;
  animationNames: string[];
}
export interface CoqfightAnimationMetadata {
  unityLength: number;
  /** Provenance only; effective gameplay/presentation loop policy belongs to native clips. */
  loop: boolean;
  scriptCurves?: Record<string, Record<string, Array<{ time: number; value: number }>>>;
  mergedFrom?: string[];
  generated?: boolean;
}
export type CoqfightAnimationMetadataCatalog = Record<string, CoqfightAnimationMetadata> & { _aliases?: Record<string, string> };
export interface CoqfightTraitRules { hidesBaseSlotWhenPresent: Record<string, string> }
export interface LoadedCoqfightCharacter {
  definition: RigDefinitionV2;
  clips: AnimationClipV2[];
  assetIds: string[];
  recipe: CoqfightCharacterRecipeV1;
  metadata: { setId: typeof COQFIGHT_SET_ID; sourceVersion: string; animationMeta: CoqfightAnimationMetadataCatalog; traitRules: CoqfightTraitRules };
}
export interface LoadCoqfightCatalogOptions extends FetchAssetOptions { pack: LoadedChiknPack }
export interface LoadCoqfightCharacterOptions extends LoadCoqfightCatalogOptions { recipe: CoqfightCharacterRecipeV1 }

const dataCaches = new WeakMap<typeof fetch, Map<string, Promise<unknown>>>();
async function fetchData<T>(pack: LoadedChiknPack, id: string, options: FetchAssetOptions): Promise<T> {
  options.signal?.throwIfAborted();
  const fetcher = options.fetch ?? globalThis.fetch;
  const cache = dataCaches.get(fetcher) ?? new Map<string, Promise<unknown>>();
  dataCaches.set(fetcher, cache);
  const file = pack.findAsset(id);
  if (!file) throw new Error(`Missing Coqfight asset: ${id}`);
  const variant = selectVariant(file, options.profile ?? pack.profile);
  if (options.maxAssetBytes !== undefined && variant.bytes > options.maxAssetBytes) throw new Error(`${file.id}: response exceeds ${options.maxAssetBytes} bytes`);
  const key = `${resolveAssetUrl(pack, id, options.profile).href}:${variant.bytes}:${variant.integrity.value}`;
  let pending = cache.get(key);
  if (!pending) {
    // An immutable shared request outlives an individual route; one caller cannot abort another.
    pending = fetchAssetBytes(pack, id, { ...options, signal: undefined }).then((bytes) => JSON.parse(new TextDecoder().decode(bytes)) as unknown).catch((error: unknown) => { cache.delete(key); throw error; });
    cache.set(key, pending);
    if (cache.size > 32) cache.delete(cache.keys().next().value!);
  }
  const data = await waitForCaller(pending, options.signal);
  options.signal?.throwIfAborted();
  return structuredClone(data) as T;
}

function waitForCaller<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return pending;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); };
    signal.addEventListener('abort', abort, { once: true });
    pending.then((value) => { signal.removeEventListener('abort', abort); resolve(value); }, (error: unknown) => { signal.removeEventListener('abort', abort); reject(error); });
  });
}

/** Fetches integrity-pinned metadata only. Media loads remain explicit and selected by the caller. */
export async function loadCoqfightCatalog({ pack, ...options }: LoadCoqfightCatalogOptions): Promise<CoqfightCatalog> {
  const catalog = await fetchData<CoqfightCatalog>(pack, 'coqfight-v1/catalog', options);
  if (catalog.schema !== 'chikn.coqfight-catalog/v1' || catalog.setId !== COQFIGHT_SET_ID || !catalog.species?.chikn || !catalog.species.roostr || !catalog.animationNames.length || new Set(catalog.animationNames).size !== catalog.animationNames.length) throw new Error('Invalid Coqfight catalog');
  return catalog;
}

/** Composes and prunes a native rig to one body, selected traits and required default-skin fallbacks. */
export async function loadCoqfightCharacter({ pack, recipe: requestedRecipe, ...options }: LoadCoqfightCharacterOptions): Promise<LoadedCoqfightCharacter> {
  assertRecipe(requestedRecipe);
  const catalog = await loadCoqfightCatalog({ pack, ...options });
  // Earlier official recipes used Run before upstream split the generated run cycle.
  const recipe = requestedRecipe.animationName === 'Run' && !catalog.animationNames.includes('Run') && catalog.animationNames.includes('Run_Slow')
    ? { ...requestedRecipe, animationName: 'Run_Slow' } : requestedRecipe;
  const species = catalog.species[recipe.species];
  if (!species.bodySkinIds.includes(recipe.bodySkinId)) throw new Error(`Unknown Coqfight body: ${recipe.bodySkinId}`);
  for (const id of recipe.traitSkinIds) if (!species.traitSkinIds.includes(id)) throw new Error(`Unknown ${recipe.species} Coqfight trait: ${id}`);
  if (!catalog.animationNames.includes(recipe.animationName)) throw new Error(`Unknown Coqfight animation: ${recipe.animationName}`);
  const prefix = `coqfight-v1/${recipe.species}`;
  const [source, clips, animationMeta, traitRules] = await Promise.all([
    fetchData<RigDefinitionV2>(pack, `${prefix}/rig`, options),
    fetchData<AnimationClipV2[]>(pack, `${prefix}/animations`, options),
    fetchData<CoqfightAnimationMetadataCatalog>(pack, `${prefix}/animation-meta`, options),
    fetchData<CoqfightTraitRules>(pack, 'coqfight-v1/trait-rules', options),
  ]);
  const normalizedRecipe = normalizeCoqfightRecipe(source, recipe);
  const definition = composeCoqfightDefinition(source, normalizedRecipe, traitRules);
  if (clips.length !== catalog.animationNames.length || clips.some((clip) => clip.schema !== 'roost2d.animation/v2') || catalog.animationNames.some((name) => !clips.some((clip) => clip.id === `coqfight-v1.${recipe.species}.${name}`))) throw new Error('Invalid native Coqfight animations');
  const assetIds = [...new Set(definition.attachments.map((attachment) => attachment.texture.assetId))];
  for (const id of assetIds) if (!pack.findAsset(id)) throw new Error(`Coqfight attachment is missing from the asset manifest: ${id}`);
  return { definition, clips, assetIds, recipe: normalizedRecipe, metadata: { setId: COQFIGHT_SET_ID, sourceVersion: catalog.sourceVersion, animationMeta, traitRules } };
}

/** Like the source viewer, a later trait removes each earlier trait that shares any occupied slot. */
export function normalizeCoqfightRecipe(source: RigDefinitionV2, recipe: CoqfightCharacterRecipeV1): CoqfightCharacterRecipeV1 {
  const selected: Array<{ id: string; slots: Set<string> }> = [];
  for (const id of recipe.traitSkinIds) {
    const table = source.attachmentNames[id];
    if (!table) throw new Error(`Coqfight trait has no attachment table: ${id}`);
    const slots = new Set(Object.keys(table));
    for (let i = selected.length - 1; i >= 0; i -= 1) if ([...selected[i]!.slots].some((slot) => slots.has(slot))) selected.splice(i, 1);
    selected.push({ id, slots });
  }
  return { ...recipe, traitSkinIds: selected.map(({ id }) => id) };
}

export function composeCoqfightDefinition(source: RigDefinitionV2, recipe: CoqfightCharacterRecipeV1, rules: CoqfightTraitRules): RigDefinitionV2 {
  recipe = normalizeCoqfightRecipe(source, recipe);
  if (source.schema !== 'roost2d.rig/v2' || source.renderOrder !== 'slots') throw new Error('Invalid native Coqfight rig');
  const names = source.attachmentNames;
  const body = names[recipe.bodySkinId];
  if (!body) throw new Error(`Coqfight body has no attachment table: ${recipe.bodySkinId}`);
  const selected = structuredClone(body);
  const defaults = structuredClone(names.default ?? {});
  const occupied = new Set<string>();
  for (const trait of recipe.traitSkinIds) {
    const table = names[trait];
    if (!table) throw new Error(`Coqfight trait has no attachment table: ${trait}`);
    for (const [slotId, values] of Object.entries(table)) {
      if (occupied.has(slotId)) throw new Error(`Conflicting Coqfight traits occupy slot ${slotId}`);
      occupied.add(slotId);
      selected[slotId] = { ...values };
    }
  }
  for (const [special, base] of Object.entries(rules.hidesBaseSlotWhenPresent)) {
    if (selected[special]?.[special] ?? defaults[special]?.[special]) { delete selected[base]; delete defaults[base]; }
  }
  const reachable = new Set(Object.values({ ...defaults, ...selected }).flatMap((table) => Object.values(table)));
  // Defaults can contribute additional names to a slot also present in the body (e.g. rifle swap).
  for (const table of Object.values(defaults)) for (const id of Object.values(table)) reachable.add(id);
  const attachments = source.attachments.filter(({ id }) => reachable.has(id));
  const attachmentIds = new Set(attachments.map(({ id }) => id));
  for (const id of reachable) if (!attachmentIds.has(id)) throw new Error(`Unknown native Coqfight attachment: ${id}`);
  const skin: Record<string, string | undefined> = {};
  const slots = source.slots.map((slot) => {
    const name = slot.defaultAttachmentName;
    const id = name ? selected[slot.id]?.[name] ?? defaults[slot.id]?.[name] : undefined;
    skin[slot.id] = id;
    return { ...slot, defaultAttachmentId: id };
  });
  return { ...source, id: `${source.id}.selected`, slots, attachments, skins: { selected: skin }, defaultSkinId: 'selected', attachmentNames: { selected, default: defaults }, attachmentGroups: {} };
}

function assertRecipe(recipe: CoqfightCharacterRecipeV1): void {
  if (!recipe || recipe.schema !== COQFIGHT_CHARACTER_SCHEMA || recipe.setId !== COQFIGHT_SET_ID || !['chikn', 'roostr'].includes(recipe.species)) throw new Error('Invalid Coqfight recipe schema, set or species');
  if (typeof recipe.bodySkinId !== 'string' || !recipe.bodySkinId || typeof recipe.animationName !== 'string' || !recipe.animationName || !Array.isArray(recipe.traitSkinIds) || recipe.traitSkinIds.some((id) => typeof id !== 'string' || !id) || new Set(recipe.traitSkinIds).size !== recipe.traitSkinIds.length) throw new Error('Invalid Coqfight body, animation or trait selection');
  if (recipe.mirrored !== undefined && typeof recipe.mirrored !== 'boolean') throw new Error('mirrored must be a boolean');
  if (recipe.renderScale !== undefined && (!Number.isFinite(recipe.renderScale) || recipe.renderScale <= 0)) throw new Error('renderScale must be a positive finite number');
}
