# Rights and attribution

The repository separates Apache-2.0 project material from Chikn community content through an exact per-file technical manifest.

## Chikn community content

Official Chikn, Roostr, and FarmLand visual sources use `license: "CHIKN-COMMUNITY-NONCOMMERCIAL"` in `manifests/rights-manifest.json`. This is a repository identifier for Chikn's existing community permission, not a licence or sublicense granted by Roost2D.

Every protected record states:

- owner: Chikn rights-holder;
- hosted by: Roost2D with permission;
- community use: non-commercial under Chikn's existing terms;
- commercial use: separate Chikn agreement required;
- repository sublicense: none.

Generated atlas PNGs, thumbnails, resized assets, and cropped frames retain the same content terms. Per-source hashes exist only for integrity and runtime lineage.

## Independently authored Apache material

Code, docs, schemas, manifest/atlas JSON, rig definitions, transforms, attachment mappings, and animation clips/timing are independently authored Apache-2.0 project material. `sources/farmland/water_swim_ring_coq.png` is also independently authored project artwork: it is deliberately published with `license: "Apache-2.0"`, `commercialUse: "allowed"`, and no Chikn ownership/permission fields. Generated pages isolate Apache project artwork from protected content, so an integrity-checked fetch never returns a mixed-rights atlas page. Artwork rendered through a rig remains Chikn community content.

## Excluded and unrelated material

Paths under `excludedPaths` have no hosted-asset classification and are omitted from both release archives. The non-Chikn `eggorithm.png` and legacy animation sprites/placeholders are explicit regression cases.

### What `excludedPaths` does and does not mean

`excludedPaths` is a **repository-only quarantine set**. It means "not part of the supported or canonical release artifacts". It does **not** mean private, secret, or undistributed.

These files are deliberately retained in Git and Git LFS as legacy reference material and as exclusion regression cases — CI *requires* them to exist so the exclusion path stays continuously tested. Because they are tracked in a public repository, they remain publicly downloadable through `git clone` and GitHub's automatic source snapshots. Anything that genuinely must not be publicly accessible belongs in private storage and must be removed from Git history; it cannot be protected by listing it here.

What the exclusion mechanism does guarantee:

- the atlas builder skips them, so they never reach `runtime/`;
- they are absent from the runtime and source release archives;
- they are unavailable through the npm runtime package.

### Retained metadata referencing excluded images

Three Apache-2.0 metadata files under `sources/legacy-enemy-flat/` reference excluded images: `enemy_attack.json` → `enemy_attack.png`, `enemy_fly.json` → `enemy_fly.png`, and `enemy_walk.json` → `enemy_walk.png`. This is harmless today because `legacy-enemy-flat` is declared `runtime: false` in `config/source-selection.json`, so the builder never reads them. If the excluded binaries are ever removed, these three metadata files must be cleaned up in the same change or they will dangle.

Read the [community asset notice](https://github.com/Roost2D/chikn-game-assets/blob/main/CHIKN-COMMUNITY-ASSET-NOTICE.md), [attribution guidance](https://github.com/Roost2D/chikn-game-assets/blob/main/ATTRIBUTION.md), and [commercial-use boundary](https://github.com/Roost2D/chikn-game-assets/blob/main/COMMERCIAL_USE.md). CI rejects missing classifications, changed hashes without manifest refresh, excluded runtime lineage, and source archives containing excluded files.
