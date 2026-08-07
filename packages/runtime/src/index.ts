export const CHIKN_ASSET_PACKAGE = '@chikn-game-assets/runtime';
export const CHIKN_ASSET_MANIFEST_PATH = 'runtime/manifest.json';
export const CHIKN_RUNTIME_LICENSE = 'Apache-2.0';
export const CHIKN_CONTENT_TERMS = {
  licenseId: 'CHIKN-COMMUNITY-NONCOMMERCIAL',
  licenseName: 'Chikn Community Asset Pack Non-Commercial Licence',
  licenseVersion: '1.1',
  licensePath: 'CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md',
  requiredAttribution: 'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm.',
  ownership: 'third-party-chikn-rights-holder',
  hostingAuthorized: true,
  communityUseAuthorized: true,
  commercialUse: 'separate-agreement-required',
  sublicenseGrantedByRepository: false,
  noticePath: 'CHIKN-COMMUNITY-ASSET-NOTICE.md',
} as const;
export type AssetProfileId = 'default' | 'high' | (string & {});

/** Absolute ceiling for a single asset response when the caller supplies no explicit limit. */
export const DEFAULT_MAX_ASSET_BYTES = 64 * 1024 * 1024;

export interface ChiknAssetManifest {
  schema: 'roost2d.assets/v1';
  version: string;
  generatedAt: string;
  rightsDocumentSha256: string;
  profiles: Record<AssetProfileId, { maxAtlasSize: number; scale: number; gpuBudgetBytes: number }>;
  files: Array<{ id: string; aliases?: string[]; kind?: string; mediaType: string; license?: 'CHIKN-COMMUNITY-NONCOMMERCIAL' | 'Apache-2.0'; ownership?: 'third-party-chikn-rights-holder'; hostingAuthorized?: boolean; communityUseAuthorized?: boolean; sublicenseGrantedByRepository?: false; commercialUse?: string; attribution?: string; rightsIds?: string[]; variants: Array<{ profile: AssetProfileId; path: string; bytes: number; integrity: { algorithm: 'sha256'; value: string }; scale: number; frameId?: string; frame?: { x: number; y: number; width: number; height: number; sourceWidth: number; sourceHeight: number } }> }>;
  bundles: Array<{ id: string; lazy: boolean; preload?: boolean; estimatedGpuBytes?: number; items: Array<{ assetId: string; required: boolean; fallbackAssetId?: string }> }>;
}

export type ChiknAssetFile = ChiknAssetManifest['files'][number];
export type ChiknAssetVariant = ChiknAssetFile['variants'][number];

export interface LoadChiknPackOptions {
  manifestUrl?: string | URL;
  baseUrl?: string | URL;
  /** Required alongside `manifestUrl` before assets can be fetched; never inferred from it. */
  assetBaseUrl?: string | URL;
  profile?: AssetProfileId;
  fetch?: typeof globalThis.fetch;
  /** Pin the manifest itself. Per-asset digests are only trustworthy if the manifest is. */
  expectedManifestSha256?: string;
}

export interface LoadedChiknPack {
  manifest: ChiknAssetManifest;
  manifestUrl: URL;
  /** Root that variant paths resolve against. Undefined when only a bare `manifestUrl` was given. */
  assetBaseUrl?: URL;
  profile: AssetProfileId;
  assetIds: readonly string[];
  bundleIds: readonly string[];
  findAsset(id: string): ChiknAssetFile | undefined;
}

/** The caller must explicitly choose a host or local base. No production host is embedded. */
export function resolveManifestUrl(baseUrl: string | URL): URL {
  if (!baseUrl) throw new Error('baseUrl is required');
  return new URL(CHIKN_ASSET_MANIFEST_PATH, ensureDirectoryUrl(baseUrl));
}

export async function fetchManifest(baseUrl: string | URL, fetcher: typeof fetch = fetch): Promise<ChiknAssetManifest> {
  return fetchManifestUrl(resolveManifestUrl(baseUrl), fetcher);
}

export async function fetchManifestUrl(
  manifestUrl: string | URL,
  fetcher: typeof fetch = fetch,
  options: { expectedManifestSha256?: string } = {},
): Promise<ChiknAssetManifest> {
  if (!fetcher) throw new Error('A fetch implementation is required');
  const url = assertFetchableUrl(manifestUrl);
  const response = await fetcher.call(globalThis, url);
  if (!response.ok) throw new Error(`Unable to load Chikn asset manifest: ${response.status}`);
  const text = await response.text();
  if (options.expectedManifestSha256) {
    const actual = await sha256Hex(new TextEncoder().encode(text));
    if (actual.toLowerCase() !== options.expectedManifestSha256.toLowerCase()) {
      throw new Error(`Chikn asset manifest digest mismatch: expected ${options.expectedManifestSha256}, got ${actual}`);
    }
  }
  const manifest = JSON.parse(text) as ChiknAssetManifest;
  if (manifest.schema !== 'roost2d.assets/v1' || !manifest.files?.length) throw new Error('Invalid or empty Chikn asset manifest');
  return manifest;
}

export async function loadChiknPack(options: LoadChiknPackOptions): Promise<LoadedChiknPack> {
  if (!options.manifestUrl && !options.baseUrl) throw new Error('manifestUrl or baseUrl is required');
  const manifestUrl = options.manifestUrl ? new URL(options.manifestUrl, globalThis.location?.href) : resolveManifestUrl(options.baseUrl!);
  // `baseUrl` roots both the manifest and the assets. A bare `manifestUrl` roots only itself:
  // deriving an asset root from it would mean guessing, so callers must say what it is.
  const assetBaseUrl = options.assetBaseUrl
    ? ensureDirectoryUrl(options.assetBaseUrl)
    : options.baseUrl ? ensureDirectoryUrl(options.baseUrl) : undefined;
  const manifest = await fetchManifestUrl(manifestUrl, options.fetch, { expectedManifestSha256: options.expectedManifestSha256 });
  const ids = [...new Set(manifest.files.flatMap(({ id, aliases = [] }) => [id, ...aliases]))];
  const index = new Map(manifest.files.map((file) => [file.id, file]));
  for (const file of manifest.files) for (const alias of file.aliases ?? []) index.set(alias, file);
  return { manifest, manifestUrl, assetBaseUrl, profile: options.profile ?? 'default', assetIds: ids, bundleIds: manifest.bundles.map(({ id }) => id), findAsset: (id) => index.get(id) };
}

export interface FetchAssetOptions {
  profile?: AssetProfileId;
  fetch?: typeof globalThis.fetch;
  maxAssetBytes?: number;
  signal?: AbortSignal;
}

/** Resolve the variant a given profile should use, with a documented fallback to `default`. */
export function selectVariant(file: ChiknAssetFile, profile: AssetProfileId = 'default'): ChiknAssetVariant {
  const variant = file.variants.find((candidate) => candidate.profile === profile)
    ?? file.variants.find((candidate) => candidate.profile === 'default')
    ?? file.variants[0];
  if (!variant) throw new Error(`Asset has no variants: ${file.id}`);
  return variant;
}

export function resolveAssetUrl(pack: LoadedChiknPack, assetId: string, profile?: AssetProfileId): URL {
  if (!pack.assetBaseUrl) {
    throw new Error('assetBaseUrl is required to resolve asset URLs; pass baseUrl, or assetBaseUrl alongside manifestUrl');
  }
  const file = pack.findAsset(assetId);
  if (!file) throw new Error(`Unknown Chikn asset: ${assetId}`);
  const variant = selectVariant(file, profile ?? pack.profile);
  const reason = portablePathError(variant.path);
  if (reason) throw new Error(`${file.id}: ${reason}`);
  const url = new URL(variant.path, pack.assetBaseUrl);
  if (url.origin !== pack.assetBaseUrl.origin || !url.pathname.startsWith(pack.assetBaseUrl.pathname)) {
    throw new Error(`${file.id}: resolved asset URL escapes the asset base`);
  }
  return url;
}

/**
 * Low-level, uncached: fetches one asset and verifies its declared byte count and SHA-256 digest.
 * Many logical ids share a single atlas page, so calling this per id re-downloads the same bytes.
 * Use `createChiknAssetCache` for batches, or `@roost2d/assets` for a full cached integration.
 */
export async function fetchAssetBytes(pack: LoadedChiknPack, assetId: string, options: FetchAssetOptions = {}): Promise<ArrayBuffer> {
  const file = pack.findAsset(assetId);
  if (!file) throw new Error(`Unknown Chikn asset: ${assetId}`);
  const profile = options.profile ?? pack.profile;
  const variant = selectVariant(file, profile);
  if (!Number.isSafeInteger(variant.bytes) || variant.bytes < 0) throw new Error(`${file.id}: invalid declared byte count`);
  if (variant.integrity?.algorithm !== 'sha256' || !/^sha256-[A-Za-z0-9+/]{43}=$/.test(variant.integrity.value)) {
    throw new Error(`${file.id}: invalid SHA-256 integrity metadata`);
  }
  const url = resolveAssetUrl(pack, assetId, profile);
  const fetcher = options.fetch ?? globalThis.fetch;
  if (!fetcher) throw new Error('A fetch implementation is required');

  const maximum = options.maxAssetBytes ?? DEFAULT_MAX_ASSET_BYTES;
  if (!Number.isSafeInteger(maximum) || maximum <= 0) throw new Error('maxAssetBytes must be a positive safe integer');
  const limit = Math.min(variant.bytes, maximum);
  const response = await fetcher.call(globalThis, url, { signal: options.signal });
  if (!response.ok) throw new Error(`Unable to load ${file.id}: ${response.status}`);
  const bytes = await readCapped(response, limit, file.id);
  if (bytes.byteLength !== variant.bytes) {
    throw new Error(`${file.id}: expected ${variant.bytes} bytes, got ${bytes.byteLength}`);
  }
  const digest = await sha256SRI(bytes);
  if (digest !== variant.integrity.value) {
    throw new Error(`${file.id}: SHA-256 integrity mismatch for ${url.href}`);
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export interface ChiknAssetCache {
  fetch(assetId: string, options?: FetchAssetOptions): Promise<ArrayBuffer>;
  unload(assetId: string, profile?: AssetProfileId): boolean;
  clear(): void;
  readonly size: number;
}

/** Caches verified bytes by resolved URL, so ids sharing one atlas page download it once. */
export function createChiknAssetCache(pack: LoadedChiknPack, defaults: FetchAssetOptions = {}): ChiknAssetCache {
  const entries = new Map<string, Promise<ArrayBuffer>>();
  const keyFor = (assetId: string, profile: AssetProfileId) => {
    const file = pack.findAsset(assetId);
    if (!file) throw new Error(`Unknown Chikn asset: ${assetId}`);
    const variant = selectVariant(file, profile);
    // A URL alone is insufficient: a malformed manifest could assign conflicting integrity
    // metadata to two logical ids sharing that URL. Only identical verification contracts share.
    return `${resolveAssetUrl(pack, assetId, profile).href}\n${variant.bytes}\n${variant.integrity.algorithm}:${variant.integrity.value}`;
  };
  return {
    fetch(assetId, options = {}) {
      const merged = { ...defaults, ...options };
      const key = keyFor(assetId, merged.profile ?? pack.profile);
      let pending = entries.get(key);
      if (!pending) {
        pending = fetchAssetBytes(pack, assetId, merged).catch((error: unknown) => { entries.delete(key); throw error; });
        entries.set(key, pending);
      }
      return pending;
    },
    unload(assetId, profile) {
      return entries.delete(keyFor(assetId, profile ?? pack.profile));
    },
    clear() { entries.clear(); },
    get size() { return entries.size; },
  };
}

export interface CharacterRigAdapterOptions<TDefinition, TRuntime> {
  loadDefinition(): Promise<TDefinition>;
  create(definition: TDefinition): TRuntime;
  applySkin?(runtime: TRuntime, skin: string): void;
  attachTrait?(runtime: TRuntime, groupId: string): void;
  skin?: string;
  traits?: readonly string[];
}

export async function createCharacterRig<TDefinition, TRuntime>(options: CharacterRigAdapterOptions<TDefinition, TRuntime>): Promise<TRuntime> {
  const runtime = options.create(await options.loadDefinition()); if (options.skin) options.applySkin?.(runtime, options.skin); for (const trait of options.traits ?? []) options.attachTrait?.(runtime, trait); return runtime;
}
export function createChiknRig<TDefinition, TRuntime>(options: CharacterRigAdapterOptions<TDefinition, TRuntime>): Promise<TRuntime> { return createCharacterRig(options); }
export function createRoostrRig<TDefinition, TRuntime>(options: CharacterRigAdapterOptions<TDefinition, TRuntime>): Promise<TRuntime> { return createCharacterRig(options); }
export function selectProfile(profile: AssetProfileId = 'default'): AssetProfileId { return profile; }
export function assetId(group: string, name: string): string { return `${group.replace(/^\/+|\/+$/g, '')}/${name.replace(/^\/+|\/+$/g, '')}`; }

function ensureDirectoryUrl(baseUrl: string | URL): URL {
  const url = assertFetchableUrl(baseUrl);
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function assertFetchableUrl(value: string | URL): URL {
  const url = new URL(value, globalThis.location?.href);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Chikn asset URLs must be http(s): received ${url.protocol}`);
  }
  return url;
}

/**
 * Reads at most `limit` bytes, aborting a response that overruns its declared size rather than
 * buffering it. Falls back to `arrayBuffer()` when a fetch implementation exposes no stream.
 */
async function readCapped(response: Response, limit: number, label: string): Promise<Uint8Array> {
  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > limit) throw new Error(`${label}: response exceeds ${limit} bytes`);
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      void Promise.resolve(reader.cancel()).catch(() => undefined);
      throw new Error(`${label}: response exceeds ${limit} bytes`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function sha256SRI(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  let binary = '';
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return `sha256-${btoa(binary)}`;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Mirrors `scripts/manifest-utils.mjs`; manifest paths must be portable relative paths. */
function portablePathError(path: string): string | null {
  if (typeof path !== 'string' || !path) return 'path must be a non-empty string';
  for (const character of path) {
    const code = character.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) return 'path must not contain control characters';
  }
  if (path.includes('\\')) return 'path must use forward slashes';
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path)) return 'path must not carry a URL scheme or drive letter';
  if (path.startsWith('/')) return 'path must be relative';
  if (/%(?:2e|2f|5c)/i.test(path)) return 'path must not contain percent-encoded separators';
  for (const segment of path.split('/')) {
    if (!segment) return 'path must not contain empty segments';
    if (segment === '.' || segment === '..') return 'path must not contain relative segments';
  }
  return null;
}
