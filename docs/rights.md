# Rights and attribution

The repository separates Apache-2.0 project material from Chikn community content through an exact per-file technical manifest.

## Chikn community content

Chikn, Roostr, and FarmLand visual sources use `license: "CHIKN-COMMUNITY-NONCOMMERCIAL"` in `manifests/rights-manifest.json`. This is a repository identifier for Chikn's existing community permission, not a licence or sublicense granted by Roost2D.

Every protected record states:

- owner: Chikn rights-holder;
- hosted by: Roost2D with permission;
- community use: non-commercial under Chikn's existing terms;
- commercial use: separate Chikn agreement required;
- repository sublicense: none.

Generated atlas PNGs, thumbnails, resized assets, and cropped frames retain the same content terms. Per-source hashes exist only for integrity and runtime lineage.

## Independently authored Apache material

Code, docs, schemas, manifest/atlas JSON, rig definitions, transforms, attachment mappings, and animation clips/timing are independently authored Apache-2.0 project material. Artwork rendered through a rig remains Chikn community content.

## Excluded and unrelated material

Paths under `excludedPaths` have no hosted-asset classification and are omitted from both release archives. `eggorithm.png`, legacy animation sprites/placeholders, and rig assembly reference images are explicit regression cases.

Read the [community asset notice](https://github.com/Roost2D/chikn-game-assets/blob/main/CHIKN-COMMUNITY-ASSET-NOTICE.md), [attribution guidance](https://github.com/Roost2D/chikn-game-assets/blob/main/ATTRIBUTION.md), and [commercial-use boundary](https://github.com/Roost2D/chikn-game-assets/blob/main/COMMERCIAL_USE.md). CI rejects missing classifications, changed hashes without manifest refresh, excluded runtime lineage, and source archives containing excluded files.
