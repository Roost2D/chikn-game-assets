# Integrating a Chikn asset release

This file travels with GitHub Release archives so a developer or coding agent can integrate them offline.

## Runtime archive layout

Preserve this layout when extracting or mirroring the runtime ZIP:

```text
<base>/
  runtime/
    manifest.json
    atlases/
      default/
      high/
  manifests/rights-manifest.json
  README.md
  LICENSE
  LICENSE-CODE
  CHIKN-COMMUNITY-ASSET-NOTICE.md
  ATTRIBUTION.md
  COMMERCIAL_USE.md
```

Supply `<base>/`, not `<base>/runtime/`, to `loadChiknPack({ baseUrl })`. The helper appends `runtime/manifest.json` itself. No public CDN is hardcoded.

## Install

```sh
npm install pixi.js @roost2d/assets @roost2d/pixi @chikn-game-assets/runtime
```

All installed `@roost2d/*` packages must use the same exact version. The asset content version may be pinned independently.

## Load

```ts
import { loadChiknPack } from '@chikn-game-assets/runtime';
import { AssetManifestResolver, LazyAssetLoader } from '@roost2d/assets';
import { PixiAssetLoader } from '@roost2d/pixi';

const baseUrl = new URL('/assets/chikn/vX.Y.Z/', window.location.origin);
const pack = await loadChiknPack({ baseUrl, profile: 'default' });
const resolver = new AssetManifestResolver(pack.manifest, { baseUrl, profile: pack.profile });
const textures = new PixiAssetLoader(resolver, new LazyAssetLoader(resolver));
const texture = await textures.load('chikn-flat/admiral');
```

Use IDs from `@chikn-game-assets/runtime/catalog` or `runtime/manifest.json`. Do not derive IDs or atlas rectangles from filenames.

## Rights

Manifest entries marked `CHIKN-COMMUNITY-NONCOMMERCIAL` are protected Chikn/Roostr/FarmLand visual content hosted with permission. The identifier records Chikn's existing non-commercial community terms; Roost2D grants no independent licence or sublicense. Code and independently authored metadata are Apache-2.0. Files in `excludedPaths`, including `eggorithm.png`, are not part of either published archive.

Read `CHIKN-COMMUNITY-ASSET-NOTICE.md`, `ATTRIBUTION.md`, and `COMMERCIAL_USE.md` before distribution. For commercial use, obtain a separate agreement from the Chikn team.

## Replacing the content pack

Roost2D's manifest and rendering packages are generic. A game can replace this archive with independently licensed artwork that follows `roost2d.assets/v1`, retain the same loader flow, and avoid all Chikn-specific content terms.
