# Asset contribution policy

## Code contributions

Community members may contribute Apache-2.0 bug fixes, loaders, build scripts, schemas, documentation, tests, generic metadata tooling, and atlas-pipeline improvements.

## Processing classified assets

Contributors may propose atlas rebuilds, lossless optimization, cropping fixes, metadata corrections, thumbnail generation, and runtime-profile generation. Every output must preserve source-to-runtime lineage and the original community-use classification.

## Adding official Chikn assets

Official Chikn, Roostr and FarmLand visual assets may be added under the same Chikn community non-commercial classification. Document their official source or provenance in the pull request, run `npm run rights:refresh`, and review the manifest and generated lineage diff.

Unknown, unrelated, or independently created community files must not be labelled as official Chikn assets. Give them their own documented rights classification or keep them under `excludedPaths`.

Per-file SHA-256 values are technical integrity records. Update them deliberately when a genuine source file changes.
