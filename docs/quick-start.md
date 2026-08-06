# Quick start

This tutorial loads one immutable Chikn runtime release into a Vanilla TypeScript + PixiJS application. It does not require a wallet, API key, backend, or blockchain connection.

> Chikn, Roostr and FarmLand assets are hosted with permission for community non-commercial use. Commercial use requires a separate agreement with the Chikn team. Roost2D grants no Chikn licence or sublicense.

## 1. Create the app

```sh
npm create vite@latest chikn-viewer -- --template vanilla-ts
cd chikn-viewer
npm install pixi.js @roost2d/assets @roost2d/pixi @chikn-game-assets/runtime
```

Keep all installed `@roost2d/*` packages on the same exact version. The image release version is independent.

## 2. Add the runtime artifact

Download `chikn-game-assets-vX.Y.Z-runtime.zip` from the matching GitHub Release. Extract it to:

```text
public/vendor/chikn-vX.Y.Z/
```

Verify that this file exists afterward:

```text
public/vendor/chikn-vX.Y.Z/runtime/manifest.json
```

The source ZIP is not needed by a running game; it is for editors, custom pipelines, and rights/source audits.

## 3. Render an asset

Replace `src/main.ts`:

```ts
import { Sprite } from 'pixi.js';
import { loadChiknPack } from '@chikn-game-assets/runtime';
import { AssetManifestResolver, LazyAssetLoader } from '@roost2d/assets';
import { PixiApplicationHost, PixiAssetLoader } from '@roost2d/pixi';

const baseUrl = new URL('/vendor/chikn-vX.Y.Z/', window.location.origin);
const profile = matchMedia('(min-resolution: 2dppx)').matches ? 'high' : 'default';
const pack = await loadChiknPack({ baseUrl, profile });
const resolver = new AssetManifestResolver(pack.manifest, {
  baseUrl,
  profile: pack.profile,
});
const integrityLoader = new LazyAssetLoader(resolver);
const textures = new PixiAssetLoader(resolver, integrityLoader);
const host = await PixiApplicationHost.create({
  mount: document.querySelector<HTMLDivElement>('#app')!,
  resizeTo: window,
  background: '#18150f',
});

const chikn = new Sprite(await textures.load('chikn-flat/admiral'));
chikn.anchor.set(0.5);
chikn.position.set(240, 220);
host.app.stage.addChild(chikn);

window.addEventListener('beforeunload', () => {
  void textures.clear();
  host.dispose();
});
```

`chikn-flat/admiral` is a stable compatibility alias. The deduplicated source file lives in the trait tree, but callers should keep using catalog/manifest IDs and must not translate the alias into a filesystem path.

Run `npm run dev`. `LazyAssetLoader` validates byte size and SHA-256; `PixiAssetLoader` returns only the requested crop while sharing its atlas page.

## 4. Find content

Use `pack.assetIds`, `pack.bundleIds`, `pack.findAsset(id)`, the npm `@chikn-game-assets/runtime/catalog` export, or `runtime/manifest.json`. Do not derive IDs from source filenames.

Example stable IDs include:

```text
chikn-flat/admiral
farmland/grass-full
```

Continue with [animated rigs](/render-chikn), [FarmLand](/farmland), or the [mini-game recipe](/mini-game).

To use Roost2D commercially without the protected content, replace this pack with independently licensed artwork that implements the same manifest contract.
