# @chikn-game-assets/runtime

## Official Coqfight rigs and animations

`loadCoqfightCatalog({ pack })` lists the pinned official body, trait and clip names. `loadCoqfightCharacter({ pack, recipe })` returns a selected-only native Roost2D v2 rig, clips, media IDs, normalized recipe and preserved source metadata. The recipe schema is `chikn.coqfight-character/v1`, with `setId: 'coqfight-v1'`, `species`, `bodySkinId`, `traitSkinIds` and `animationName`.

Imported official rig/animation/trait data and native derivatives stay in the separate runtime archive under the upstream **Chikn Community Asset Licence**, preserved here as `COQFIGHT-ASSET-LICENSE.md`. The catalog records its hash and runtime path. Existing exact artwork reused from earlier releases retains its original per-file classification. This npm package contains helper code, ID catalogs and legal notices only; it does not include the official rig/animation JSON or artwork and does not add a Spine runtime dependency.

The current pinned set has 41 clips. `Idle`, `IdleHurt`, `Walk`, `Run`, `Victory` and `Flap` loop by default; the other clips play once. `metadata.animationMeta` preserves the upstream loop flags, durations, generated flags and target-relative approach curves independently. Applications keep approach motion outside authoritative gameplay coordinates.

Apache-2.0 TypeScript helpers and a generated ID catalog for a separately hosted Chikn Game Assets release. This npm package contains no source images, audio, or runtime media and does not grant rights to Chikn, Roostr, or FarmLand content.

```sh
npm install @chikn-game-assets/runtime
```

```ts
import { CHIKN_CONTENT_TERMS, loadChiknPack } from '@chikn-game-assets/runtime';

const pack = await loadChiknPack({
  baseUrl: 'https://cdn.example/chikn/v1.0.0/',
  profile: 'default',
});
const asset = pack.findAsset('chikn-flat/admiral');
console.log(CHIKN_CONTENT_TERMS.ownership);
```

`baseUrl` must point to the directory containing `runtime/manifest.json`; no production host is embedded. It roots the manifest, atlas pages, and direct audio files. Use `@roost2d/assets` and `@roost2d/pixi` for cached integrity-checked loading and cropped Pixi textures — that remains the recommended image integration.

## Loading verified bytes without Roost2D

`fetchAssetBytes` fetches a single atlas page or direct audio file and verifies its declared byte count and SHA-256 digest before returning it. It refuses variant paths that are absolute, traversing, percent-encoded, or off-origin, and aborts a response that overruns its declared size.

```ts
import { createChiknAssetCache, fetchAssetBytes, loadChiknPack } from '@chikn-game-assets/runtime';

const pack = await loadChiknPack({
  baseUrl: 'https://cdn.example/chikn/v1.0.0/',
  // Optional: pin the manifest itself. Per-asset digests are only trustworthy if the manifest is.
  expectedManifestSha256: '…',
});

const bytes = await fetchAssetBytes(pack, 'chikn-flat/admiral');
const sound = await fetchAssetBytes(pack, 'audio/bok-gark-01');
```

Many logical image IDs share one atlas page, while each `audio/*` ID resolves to one direct MP3. `fetchAssetBytes` is deliberately low-level and uncached. For batches use `createChiknAssetCache(pack)`, which shares bytes only when the resolved URL, byte count, and integrity metadata all match, and exposes `unload(assetId)` and `clear()`.

If you pass a bare `manifestUrl` instead of `baseUrl`, the asset root is not inferred from it. Supply `assetBaseUrl` explicitly, or asset resolution throws.

Manifest entries marked `CHIKN-COMMUNITY-NONCOMMERCIAL` remain owned by Chikn. Existing pack content retains the Chikn Community Asset Pack Non-Commercial Licence, Version 1.1. Imported official Coqfight content and native rig/animation derivatives instead identify their preserved upstream `LICENSE.md` and SHA-256 in the rights record. Consult that record and the notices supplied with the matching runtime archive. Roost2D is an authorised distributor only and grants no Chikn licence, sublicense or commercial rights. A manifest entry marked `Apache-2.0`, such as `farmland/water-swim-ring-coq`, is separately classified project artwork and is not Chikn property.

IDs such as `chikn-flat/admiral` and dotted rig names may be compatibility aliases rather than primary file IDs. Always call `findAsset` (or use a Roost2D manifest resolver) instead of translating an ID into a source path.

Read the [full Chikn licence](https://github.com/Roost2D/chikn-game-assets/blob/main/CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md), [repository licensing notice](https://github.com/Roost2D/chikn-game-assets/blob/main/REPOSITORY-LICENSING-NOTICE_PUBLIC.md), [attribution requirements](https://github.com/Roost2D/chikn-game-assets/blob/main/ATTRIBUTION.md), and [complete integration guide](https://github.com/Roost2D/chikn-game-assets/blob/main/INTEGRATION.md).
