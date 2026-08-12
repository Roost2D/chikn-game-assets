# Integrating a Chikn asset release

This file travels with GitHub Release archives so a developer or coding agent can integrate them offline.

## Runtime archive layout

The runtime ZIP contains the files that belong inside `<base>/runtime/`. Extract or mirror the archive into that directory and preserve this layout:

```text
<base>/
  runtime/
    manifest.json
    atlases/
      default/
      high/
    audio/
    rights-manifest.json
    reports/source-runtime-lineage.json
    README.md
    INTEGRATION.md
    docs/audio.md
    CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md
    REPOSITORY-LICENSING-NOTICE_PUBLIC.md
    CHIKN-COMMUNITY-ASSET-NOTICE.md
    ATTRIBUTION.md
    COMMERCIAL_USE.md
```

Supply `<base>/`, not `<base>/runtime/`, to `loadChiknPack({ baseUrl })`. The helper appends `runtime/manifest.json` itself. No public CDN is hardcoded.

## Install

```sh
npm install pixi.js gsap @chikn-game-assets/runtime \
  @roost2d/assets @roost2d/chikn-rigs @roost2d/contracts @roost2d/pixi @roost2d/rig2d
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

Audio entries use `kind: "audio"`, `mediaType: "audio/mpeg"`, and stable `audio/*` IDs. They are identical across the `default` and `high` profiles, so callers can resolve or fetch them through the same manifest helper:

```ts
import { fetchAssetBytes } from '@chikn-game-assets/runtime';

const bytes = await fetchAssetBytes(pack, 'audio/bok-gark-01');
```

The source filename and SHA-256 rights record remain available through `runtime/reports/source-runtime-lineage.json` and `runtime/rights-manifest.json` after extraction (`reports/source-runtime-lineage.json` and `manifests/rights-manifest.json` in the repository/source archive). See `runtime/docs/audio.md` for the complete convention.

## Animate a complete rig

This is the canonical browser path used by the repository's **Animated Rig** showcase. It deliberately contains no Chikn/Roostr scale constants, trait reparenting, z-order rewrites, or special handling for assembled unique artwork.

```ts
import { loadChiknPack } from '@chikn-game-assets/runtime';
import { AssetManifestResolver, LazyAssetLoader } from '@roost2d/assets';
import {
  loadChiknAnimations,
  loadChiknRig,
  mergeUniqueSkin,
  resolveUniqueSkin,
  uniqueAssetPrefix,
} from '@roost2d/chikn-rigs';
import { PixiApplicationHost, PixiAssetLoader, PixiRigFactory } from '@roost2d/pixi';
import { RigRuntime } from '@roost2d/rig2d';

const baseUrl = new URL('/assets/chikn/vX.Y.Z/', window.location.origin);
const pack = await loadChiknPack({ baseUrl, profile: 'default' });
const resolver = new AssetManifestResolver(pack.manifest, { baseUrl, profile: pack.profile });
const textures = new PixiAssetLoader(resolver, new LazyAssetLoader(resolver));
const host = await PixiApplicationHost.create({
  mount: document.querySelector<HTMLDivElement>('#app')!,
  resizeTo: window,
});

let definition = await loadChiknRig();
const clips = await loadChiknAnimations();
const unique = resolveUniqueSkin('chikn', 1231)!;
definition = mergeUniqueSkin(
  definition,
  unique,
  pack.assetIds.filter((id) => id.startsWith(uniqueAssetPrefix(unique))),
);

const entries = await Promise.all(
  [...new Map(definition.attachments.map(({ texture }) => [
    texture.frameId ? `${texture.assetId}#${texture.frameId}` : texture.assetId,
    texture,
  ])).entries()].map(async ([key, texture]) => [key, await textures.load(texture.assetId)] as const),
);
const factory = new PixiRigFactory(new Map(entries));
const rig = new RigRuntime(definition, factory, clips);
host.app.stage.addChild(factory.root);
factory.root.position.set(320, 360);
rig.applySkin(unique.skinId);
rig.attachGroup('head/daft-punk');
rig.play('chikn.idle', { layer: 'base' });

window.addEventListener('beforeunload', () => {
  rig.dispose();
  factory.destroyRoot();
  void textures.clear();
  host.dispose();
});
```

For Roostr, use `loadRoostrRig()`, `loadRoostrAnimations()`, and a Roostr entry from `resolveUniqueSkin`. Both `default` and `high` profiles use the same rig metadata; the manifest selects the sampled atlas data while the adapter preserves rig-space layout.

## Rights

Manifest entries marked `CHIKN-COMMUNITY-NONCOMMERCIAL` are protected Chikn/Roostr/FarmLand visual or audio content governed by `CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md`, Version 1.1. Chikn grants that licence directly; Roost2D is an authorised distributor only and grants no Chikn licence, sublicense or commercial rights. Entries marked `Apache-2.0`, currently including `farmland/water-swim-ring-coq`, are independently authored project material and do not belong to Chikn. Files in `excludedPaths`, including the non-Chikn `eggorithm.png`, are not part of either published archive.

Legacy flat and rig IDs are manifest aliases, not source-directory names. Resolve them with `findAsset`, `AssetManifestResolver`, or the generated catalog; do not construct a filesystem path from `chikn-flat/*`, `roostr-flat/*`, or dotted rig aliases.

Every redistribution must retain the unmodified `CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md`, the applicable Asset Manifest, and the exact attribution in `ATTRIBUTION.md`. For commercial use, obtain a separate written agreement from Chikn.

## Replacing the content pack

Roost2D's manifest and rendering packages are generic. A game can replace this archive with independently licensed artwork that follows `roost2d.assets/v1`, retain the same loader flow, and avoid all Chikn-specific content terms.
