# Later Roostrift and Bokstrike adoption

The shared release implements the shared libraries, asset builder, website and
Chikn starter. Game adoption remains a later task. The engine version is
`0.10.0`, and the asset helper/media version is `0.7.0`. All official source and converted data is in
the separately licensed immutable media artifact; npm tarballs contain code,
types, IDs and notices only.

## Source and compatibility

The inspected game baseline was `cebass/roostrift` master `70507ef` on
25 November 2026. Re-check its current production lineage before adoption and
use a fresh isolated worktree. Preserve other worktrees, ongoing balance work,
existing source/evidence qualification and platform synchronization requirements.

Keep authored loaders and V1 recipes/actions available. Official recipes use
`chikn.coqfight-character/v1` and exact upstream body/trait/animation names.
Do not silently reinterpret saved authored IDs. The catalog contains 41 clips,
including upstream-generated locomotion; it is not an automatic mapping from
game actions to damage, cooldowns, hit frames, collisions or projectile cues.

## Roostrift

- Keep the `Character` facade and `chiknAnimationPolicy` presentation mapping.
  Introduce an explicit official-set choice rather than replacing authored rigs.
- Update the installed engine/helper pins, `ChiknAssetPack` release/manifest
  digests, vendoring script and media lock together. The inspected game deliberately
  separated helper 0.6.3 from compatible media 0.6.1; do not infer media versions
  from helper versions.
- Prepare only the selected body's/traits' animation-reachable textures. Preserve
  game-owned outer positioning, facing, overlays and socket mappings. Skeletal
  root movement and optional RelativeX approach curves belong below that root.
- Run the existing character rig/scale, asset manifest, animation policy and pack
  tests, then locally inspect ordinary/unique characters and combat scenes with
  both profiles and facings. Preserve simulation timing and authoritative state.

## Bokstrike

Active consumers are under `Game/apps/rift-wings-web/src/bokstrike/`:
`birdRig`, `glideBird`, `nativeBirdArt`, `birdRigRelease` and `birdRigMetadata`.
The release metadata generator is
`Game/scripts/site-release/sync-rig-metadata.mjs`. Update its immutable metadata
folder, exact size/hash pins, helper version and media digests as one reviewed
change. Keep authored flight available until an explicit action mapping is tested.

The current Canvas fallback walks the Pixi tree. Global V2 slot order is independent
of that tree, so adding V2 to this consumer requires an explicit fallback update
and visual proof of matching order; do not assume a Pixi-only change covers it.

Applicable rendering/assets changes must cover web, Steam browser worker and
Windows native worker together, following the then-current Game/AGENTS.md. Validate
the shared sync baseline, relevant rig checks, Steam tests/build and normal-entry
local web/packaged scenes before recording a new baseline. Never rebind old
qualification evidence to changed source, dependencies or assets.

## Release handoff

Use the reviewed source/asset manifests and archive digests from the published release
verification receipt. Do not point game clients at mutable upstream URLs. Keep
both original licence documents and per-file rights lineage with mirrored content.
Game adoption and game deployment remain separate from this library/site release.
