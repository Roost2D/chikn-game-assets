# @chikn-game-assets/runtime

Apache-2.0 TypeScript helpers and a generated ID catalog for a separately hosted Chikn Game Assets release. This npm package contains no source images or atlas PNGs and does not grant rights to Chikn, Roostr, or FarmLand artwork.

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

`baseUrl` must point to the directory containing `runtime/manifest.json`; no production host is embedded. It roots both the manifest and the atlas pages. Use `@roost2d/assets` and `@roost2d/pixi` for cached integrity-checked loading and cropped Pixi textures — that remains the recommended integration.

## Loading verified bytes without Roost2D

`fetchAssetBytes` fetches a single atlas page and verifies its declared byte count and SHA-256 digest before returning it. It refuses variant paths that are absolute, traversing, percent-encoded, or off-origin, and aborts a response that overruns its declared size.

```ts
import { createChiknAssetCache, fetchAssetBytes, loadChiknPack } from '@chikn-game-assets/runtime';

const pack = await loadChiknPack({
  baseUrl: 'https://cdn.example/chikn/v1.0.0/',
  // Optional: pin the manifest itself. Per-asset digests are only trustworthy if the manifest is.
  expectedManifestSha256: '…',
});

const bytes = await fetchAssetBytes(pack, 'chikn-flat/admiral');
```

Many logical IDs share one atlas page, so `fetchAssetBytes` is deliberately low-level and uncached — calling it per ID re-downloads the same bytes. For batches use `createChiknAssetCache(pack)`, which shares bytes only when the resolved URL, byte count, and integrity metadata all match, and exposes `unload(assetId)` and `clear()`.

If you pass a bare `manifestUrl` instead of `baseUrl`, the asset root is not inferred from it. Supply `assetBaseUrl` explicitly, or asset resolution throws.

Chikn, Roostr and FarmLand visual assets remain owned by their respective rights holder. Roost2D hosts the classified asset set with permission for community non-commercial use and grants no independent licence or sublicense. Commercial use requires a separate Chikn agreement.

Read the [community asset notice](https://github.com/Roost2D/chikn-game-assets/blob/main/CHIKN-COMMUNITY-ASSET-NOTICE.md), [attribution guidance](https://github.com/Roost2D/chikn-game-assets/blob/main/ATTRIBUTION.md), [commercial-use boundary](https://github.com/Roost2D/chikn-game-assets/blob/main/COMMERCIAL_USE.md), and [complete integration guide](https://github.com/Roost2D/chikn-game-assets/blob/main/INTEGRATION.md).
