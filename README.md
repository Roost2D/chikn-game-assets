# Chikn Game Assets

This repository hosts Chikn, Roostr, and FarmLand visual artwork for community non-commercial use as individually classified sources plus deterministic `default` and `high` runtime atlases. It also publishes the small Apache-2.0 `@chikn-game-assets/runtime` helper for finding and loading a caller-hosted release.

> Chikn, Roostr and FarmLand visual assets remain owned by their respective rights holder. They are hosted here with permission for community non-commercial use. This repository does not grant a commercial licence. Commercial use requires a separate agreement with the Chikn team.

## What belongs to Chikn

Chikn, Roostr, and FarmLand visual artwork is represented as protected Chikn content. Classified files use `license: "CHIKN-COMMUNITY-NONCOMMERCIAL"` and retain SHA-256 hashes in [`manifests/rights-manifest.json`](manifests/rights-manifest.json) for technical integrity and runtime lineage. The identifier points to Chikn's existing community terms; it is not a new licence or sublicense created by this repository.

The following are not Chikn property:

- rig definitions, transforms, attachment mappings, and animation timing data;
- engine/runtime code, schemas, manifests, atlas-coordinate JSON, build scripts, and documentation;
- unrelated project/demo material such as `eggorithm.png`.

Project-created code and metadata are Apache-2.0. Excluded project images are listed in `excludedPaths` and cannot enter published source/runtime artifacts. The Chikn/Roostr artwork displayed by a rig remains protected even though the rig structure and animation data are separate project work.

Read the [community asset notice](CHIKN-COMMUNITY-ASSET-NOTICE.md), [attribution guidance](ATTRIBUTION.md), and [commercial-use boundary](COMMERCIAL_USE.md) before using the hosted content.

## Why there are three release artifacts

| Artifact | Contains | Use it when |
| --- | --- | --- |
| `@chikn-game-assets/runtime` | TypeScript types, loader helpers, asset/bundle ID catalog, legal notices; no images | your application needs stable IDs and an explicit manifest URL |
| `chikn-game-assets-vX.Y.Z-runtime.zip` | `runtime/manifest.json`, integrity metadata, generated `default`/`high` atlas PNG/JSON | a game needs immutable, CDN-ready runtime content |
| `chikn-game-assets-vX.Y.Z-sources.zip` | classified individual sources, source atlases, project metadata, rights manifest, notices, docs | an editor/build pipeline needs originals or an auditor needs source-to-runtime lineage |

The split keeps npm installs small, prevents a package from silently choosing a production host, makes the community-use boundary visible, and lets applications pin, mirror, or replace an immutable image release independently from engine code. Roost2D works without this content pack and can be used with independently licensed replacement artwork.

## Quick start with Roost2D and PixiJS

```sh
npm install pixi.js @roost2d/assets @roost2d/pixi @chikn-game-assets/runtime
```

Download the matching runtime ZIP from GitHub Releases and extract it to `/public/vendor/chikn-vX.Y.Z/`. Preserve the `runtime/` directory.

```ts
import { Sprite } from 'pixi.js';
import { loadChiknPack } from '@chikn-game-assets/runtime';
import { AssetManifestResolver, LazyAssetLoader } from '@roost2d/assets';
import { PixiApplicationHost, PixiAssetLoader } from '@roost2d/pixi';

const baseUrl = new URL('/vendor/chikn-vX.Y.Z/', window.location.origin);
const pack = await loadChiknPack({ baseUrl, profile: 'default' });
const resolver = new AssetManifestResolver(pack.manifest, { baseUrl, profile: pack.profile });
const textures = new PixiAssetLoader(resolver, new LazyAssetLoader(resolver));
const host = await PixiApplicationHost.create({
  mount: document.querySelector<HTMLDivElement>('#app')!,
  resizeTo: window,
});

const chikn = new Sprite(await textures.load('chikn-flat/admiral'));
chikn.anchor.set(0.5);
chikn.position.set(240, 220);
host.app.stage.addChild(chikn);
```

The logical asset ID resolves to a cropped Pixi texture; consumers never calculate atlas frames themselves. See the [complete quick start](docs/quick-start.md), [rig tutorial](docs/render-chikn.md), and [offline integration guide](INTEGRATION.md).

## For coding agents

Start with [`AGENTS.md`](AGENTS.md) and [`llms.txt`](llms.txt). They identify source-of-truth files, generated outputs, rights invariants, repository boundaries, and required verification commands. Release archives also include these files so agents can integrate downloaded artifacts without guessing their layout or license.

## Local verification

```sh
npm ci
npm run release:verify
```

The gate rebuilds the inventory and atlases, validates per-file rights, type-checks/tests the runtime helper, checks reproducibility and Git LFS coverage, inspects the npm tarball, and stages the source archive while proving excluded material is absent.

Maintainers should follow the [release operator runbook](docs/releases.md#release-operator-runbook);
the first npm publication has a one-time bootstrap step, while later releases use GitHub trusted
publishing.
