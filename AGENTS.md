# Chikn Game Assets coding-agent guide

## Read first

1. Read `llms.txt`, `README.md`, and `LICENSE`.
2. For integration work read `INTEGRATION.md` and `docs/quick-start.md`.
3. For pipeline work inspect the relevant `config/*.json`, script, generated report, and test together.

## Repository boundary

- `sources/` contains original inputs. Binary sources use Git LFS.
- `config/source-selection.json` chooses source groups and whether a group enters runtime output.
- `config/asset-aliases.json` preserves semantic and legacy IDs while keeping only one physical copy of identical source art.
- `config/rights-policy.json` defines content, metadata, and excluded-path treatment.
- `manifests/rights-manifest.json` is generated but review-sensitive: it records exact per-file classifications and hashes.
- `runtime/`, `reports/`, and `packages/runtime/catalog` are generated. Do not hand-edit them.
- `packages/runtime` is Apache-2.0 TypeScript and contains no image corpus.
- `apps/showcase` is a catalog/learning app, not the production asset host.

## Rights invariants

- Official Chikn, Roostr, and FarmLand visual artwork is protected Chikn content (`CHIKN-COMMUNITY-NONCOMMERCIAL`). This stable identifier refers to `CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md`, Version 1.1, granted directly by Chikn; it is not a Roost2D-authored licence.
- Protected records must state third-party Chikn ownership, `hostingAuthorized: true`, `communityUseAuthorized: true`, and `sublicenseGrantedByRepository: false`.
- Rig definitions, transforms, animations/timing, manifests, schemas, code, docs, and the specifically classified `water_swim_ring_coq.png` are project-authored Apache-2.0 material.
- The artwork rendered by a rig remains protected even though the rig/animation metadata is separate.
- `excludedPaths` are not Chikn property and must not enter generated runtime or GitHub Release artifacts. `eggorithm.png` is the canonical regression example.
- Never refresh the rights manifest as a side effect. Run `npm run rights:refresh` only after deliberate rights review, then inspect the complete diff.
- Official Chikn/Roostr/FarmLand additions require documented official provenance, deliberate `rights:refresh`, and review of the manifest/lineage diff; read `ASSET_CONTRIBUTIONS.md`.

## Source-layout invariants

- Canonical character art is the Chikn/Roostr source atlas pair plus high-resolution individual files in the two trait trees; missing base parts belong under `traits-*/Base/<skin>/`.
- Do not recreate `sources/chikn-flat`, `sources/roostr-flat`, `sources/rig-chikn`, or `sources/rig-roostr`.
- Do not copy an identical image to preserve a second semantic name. Keep one canonical file and add the alternate ID/rig alias to `config/asset-aliases.json`.
- `npm run check` executes `verify-source-layout.mjs`, which rejects retired copy roots and every exact duplicate source image.

## Artifact contract

- npm runtime package: code/types/catalog/legal notices only; no image files.
- runtime ZIP: immutable manifest plus default/high generated atlases, the unmodified Chikn licence, and public notices for games/CDNs.
- sources ZIP: only classified sources/metadata plus the unmodified Chikn licence and supporting docs; excludes `excludedPaths`.
- Consumers supply their own host/base URL. Never hardcode a production CDN.

## Validation

```sh
npm ci
npm run release:verify
```

After an intentional source/rights change:

```sh
npm run rights:refresh
npm run release:verify
git diff -- manifests reports runtime
```

CI validates Linux exact bytes and cross-platform decoded pixels/semantic manifests.

## Releases

Do not publish without an explicit release decision. Publish Roost2D packages to `next` first, then this runtime to `next`, then run the cross-repository consumer check. Stable versions publish to `latest`; a `v*` tag creates the classified source/runtime GitHub archives.
