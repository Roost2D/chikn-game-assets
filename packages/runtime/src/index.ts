export const CHIKN_ASSET_PACKAGE = '@chikn-game-assets/runtime';
export const CHIKN_ASSET_MANIFEST_PATH = 'runtime/manifest.json';
export const CHIKN_RUNTIME_LICENSE = 'Apache-2.0';
export const CHIKN_CONTENT_TERMS = {
  licenseId: 'CHIKN-COMMUNITY-NONCOMMERCIAL',
  ownership: 'third-party-chikn-rights-holder',
  hostingAuthorized: true,
  communityUseAuthorized: true,
  commercialUse: 'separate-agreement-required',
  sublicenseGrantedByRepository: false,
  noticePath: 'CHIKN-COMMUNITY-ASSET-NOTICE.md',
} as const;
export type AssetProfileId = 'default' | 'high' | (string & {});

export interface ChiknAssetManifest {
  schema: 'roost2d.assets/v1';
  version: string;
  generatedAt: string;
  rightsDocumentSha256: string;
  profiles: Record<AssetProfileId, { maxAtlasSize: number; scale: number; gpuBudgetBytes: number }>;
  files: Array<{ id: string; aliases?: string[]; kind?: string; mediaType: string; license?: 'CHIKN-COMMUNITY-NONCOMMERCIAL' | 'Apache-2.0'; ownership?: 'third-party-chikn-rights-holder'; hostingAuthorized?: boolean; communityUseAuthorized?: boolean; sublicenseGrantedByRepository?: false; commercialUse?: string; rightsIds?: string[]; variants: Array<{ profile: AssetProfileId; path: string; bytes: number; integrity: { algorithm: 'sha256'; value: string }; scale: number; frameId?: string; frame?: { x: number; y: number; width: number; height: number; sourceWidth: number; sourceHeight: number } }> }>;
  bundles: Array<{ id: string; lazy: boolean; preload?: boolean; estimatedGpuBytes?: number; items: Array<{ assetId: string; required: boolean; fallbackAssetId?: string }> }>;
}

export interface LoadChiknPackOptions { manifestUrl?: string | URL; baseUrl?: string | URL; profile?: AssetProfileId; fetch?: typeof globalThis.fetch; }
export interface LoadedChiknPack {
  manifest: ChiknAssetManifest;
  manifestUrl: URL;
  profile: AssetProfileId;
  assetIds: readonly string[];
  bundleIds: readonly string[];
  findAsset(id: string): ChiknAssetManifest['files'][number] | undefined;
}

/** The caller must explicitly choose a host or local base. No production host is embedded. */
export function resolveManifestUrl(baseUrl: string | URL): URL {
  if (!baseUrl) throw new Error('baseUrl is required');
  return new URL(CHIKN_ASSET_MANIFEST_PATH, ensureDirectoryUrl(baseUrl));
}

export async function fetchManifest(baseUrl: string | URL, fetcher: typeof fetch = fetch): Promise<ChiknAssetManifest> { return fetchManifestUrl(resolveManifestUrl(baseUrl), fetcher); }
export async function fetchManifestUrl(manifestUrl: string | URL, fetcher: typeof fetch = fetch): Promise<ChiknAssetManifest> {
  if (!fetcher) throw new Error('A fetch implementation is required');
  const response = await fetcher(manifestUrl); if (!response.ok) throw new Error(`Unable to load Chikn asset manifest: ${response.status}`);
  const manifest = await response.json() as ChiknAssetManifest; if (manifest.schema !== 'roost2d.assets/v1' || !manifest.files?.length) throw new Error('Invalid or empty Chikn asset manifest'); return manifest;
}

export async function loadChiknPack(options: LoadChiknPackOptions): Promise<LoadedChiknPack> {
  if (!options.manifestUrl && !options.baseUrl) throw new Error('manifestUrl or baseUrl is required');
  const manifestUrl = options.manifestUrl ? new URL(options.manifestUrl, globalThis.location?.href) : resolveManifestUrl(options.baseUrl!);
  const manifest = await fetchManifestUrl(manifestUrl, options.fetch); const ids = manifest.files.map(({ id }) => id); const index = new Map(manifest.files.map((file) => [file.id, file]));
  for (const file of manifest.files) for (const alias of file.aliases ?? []) index.set(alias, file);
  return { manifest, manifestUrl, profile: options.profile ?? 'default', assetIds: ids, bundleIds: manifest.bundles.map(({ id }) => id), findAsset: (id) => index.get(id) };
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

function ensureDirectoryUrl(baseUrl: string | URL): URL { const url = new URL(baseUrl, globalThis.location?.href ?? 'http://localhost/'); if (!url.pathname.endsWith('/')) url.pathname += '/'; return url; }
