# Chikn Game Assets

This repository hosts the official Chikn, Roostr, and FarmLand visual corpus for community non-commercial use as individually classified sources plus deterministic `default` and `high` runtime atlases. It also publishes the small Apache-2.0 `@chikn-game-assets/runtime` helper and a narrowly classified project-art exception.

> Official Chikn, Roostr and FarmLand visual assets remain owned by their respective rights holder. Protected entries are hosted here with permission for community non-commercial use. This repository does not grant a commercial licence for those entries. Commercial use requires a separate agreement with the Chikn team; explicitly Apache-2.0 project entries are outside that restriction.

## What belongs to Chikn

Official Chikn, Roostr, and FarmLand visual artwork is represented as protected Chikn content. Classified files use `license: "CHIKN-COMMUNITY-NONCOMMERCIAL"` and retain SHA-256 hashes in [`manifests/rights-manifest.json`](manifests/rights-manifest.json) for technical integrity and runtime lineage. The identifier points to Chikn's existing community terms; it is not a new licence or sublicense created by this repository.

The following are not Chikn property:

- rig definitions, transforms, attachment mappings, and animation timing data;
- engine/runtime code, schemas, manifests, atlas-coordinate JSON, build scripts, and documentation;
- `water_swim_ring_coq.png`, which is published project artwork classified as Apache-2.0;
- unrelated repository-only material such as `eggorithm.png`, which is excluded from every release artifact.

Project-created code, metadata, and the explicitly listed swim-ring artwork are Apache-2.0. Other excluded project images are listed in `excludedPaths` and cannot enter published source/runtime artifacts. The Chikn/Roostr artwork displayed by a rig remains protected even though the rig structure and animation data are separate project work.

## Canonical source layout

The Chikn and Roostr corpus deliberately keeps only two representations: retained source atlas PNG/JSON pairs under `sources/chikn-atlas` and `sources/roostr-atlas`, plus categorized high-resolution individual files under `sources/traits-chikn` and `sources/traits-roostr`. Base/body parts missing from the old trait folders live under each `Base/` directory.

The former `chikn-flat`, `roostr-flat`, `rig-chikn`, and `rig-roostr` copy trees were removed. Exact same-byte files are stored once and represented by aliases from [`config/asset-aliases.json`](config/asset-aliases.json). Existing IDs such as `chikn-flat/admiral`, legacy rig IDs, and dotted `chikn.rig.*`/`roostr.rig.*` references remain supported; consumers should resolve IDs through the manifest/runtime helper and never infer paths from the source tree.

Read the [community asset notice](CHIKN-COMMUNITY-ASSET-NOTICE.md), [attribution guidance](ATTRIBUTION.md), and [commercial-use boundary](COMMERCIAL_USE.md) before using the hosted content.

## Why there are three release artifacts

| Artifact | Contains | Use it when |
| --- | --- | --- |
| `@chikn-game-assets/runtime` | TypeScript types, loader helpers, asset/bundle ID catalog, legal notices; no images | your application needs stable IDs and an explicit manifest URL |
| `chikn-game-assets-vX.Y.Z-runtime.zip` | `runtime/manifest.json`, integrity metadata, generated `default`/`high` atlas PNG/JSON | a game needs immutable, CDN-ready runtime content |
| `chikn-game-assets-vX.Y.Z-sources.zip` | canonical individual traits/base parts, source atlases, classified project artwork/metadata, rights manifest, notices, docs | an editor/build pipeline needs originals or an auditor needs source-to-runtime lineage |

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
