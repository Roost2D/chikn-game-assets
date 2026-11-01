# Bokstrike: integrate the V2 trait assembly release

Update every installed `@roost2d/*` package to exact `0.8.0` and `@chikn-game-assets/runtime` to exact `0.6.2` together in a dedicated integration worktree. Update both `Game/package.json` and workspace manifests, regenerate the shared lockfile and check `npm ls` for duplicate/older engine versions. These versions are the stable release targets; registry publication and verification results are recorded in the release handoff in `kontext/inbox`.

No Bokstrike source, head artifact, dependency, process or deployment was changed by the library release task. Coordinate the integration with the ongoing Bokstrike work; use its current branch as the integration base. Do not reset or replace those worktrees.

## What the libraries provide

The corrected rigs cover all 276 ordinary Chikn/Roostr groups using Chikn V2 build1 and Roostr V2 build3 placements. They include the previously reported hair, horns, Samurai, shoes, chains, second head, eggs/exhausts, shoulder armour, shorts, muscles/claws and held-item fixes. Cutlass keeps its original source orientation; PermaBull has separate near/far horn depths; the smaller Chikn Jockey sits on the back with anchored action motion.

The owner's layer policy is common library metadata: 44 held props behind the front wing, all 13 coat-like garments and breastplates above it. Both leg branches, including their animated shins, toes and equipped footwear, sit behind coats and the torso sprite while garments are equipped. Removing a garment restores the original depths. Do not reapply old game-local offset, mirror or z-order patches after composition.

The package set also carries original-image texture regions, reversible base-head clipping for Samurai and `resolveChiknTraitGroup(definition, category, nftLabel)`. All companion contracts, Rig2D and Pixi packages must use the same version; a partial `chikn-rigs` bump is insufficient. Preserve region/clipping fields if adapting the shared renderer.

## Two distinct presentation paths

Read-only inspection on 1 November 2026 of `codex/bokstrike-web-compatible-2026-11-01` found `Game/apps/rift-wings-web/src/bokstrike/render.ts` delegating pilot-head rendering to `pilot.ts`. Its static head/flight-helmet pipeline is maintained by `Game/scripts/bokstrike/heads.mjs`, `head-extraction.mjs`, `build-head-masks.mjs` and `build-flight-heads.mjs`, with several audit/review scripts. This path does not automatically change when a rig package is upgraded. Preserve ongoing flight-head/helmet work and review its integration separately; do not regenerate or overwrite head outputs merely to bump the libraries.

Full-rig consumers live in `Game/apps/rift-wings-web/src/game/RiderRig.ts` and `src/game/vendor/rosterCharacter.ts`. These receive the layout corrections from the upgraded packages. Baseline `RiderRig.ts` selects an ordinary skin by hash when no unique skin is resolved and attaches trait names without their category, silently skipping failures. When real body metadata exists, select its actual skin. Resolve each equipped label using its category through `resolveChiknTraitGroup`; report unresolved labels instead of silently dropping traits. Retain deterministic fallbacks for starter/bot identities without NFT metadata.

## Media and compatibility

No source artwork, asset IDs, licence terms or rights manifest changed. Keep the existing immutable media release and integrity lock (`0.6.1` remains compatible); npm helper and media versions are independent. Keep the game's host/base URL and attribution. Do not use legacy 3D NFT `metadata.image` as a placement reference.

`Hairy Old Man` resolves to Roostr Beard and `Ropians Hat` to Grandpa within their category. Chikn Polygon Bling/Polygon Degen and Roostr MFD have no matched live V2 label, but retain their ordinary library previews. Reconstructed Roostr chains reuse existing official Chikn textures. Unique skins retain their existing separate path and require their own game-level review.

## Acceptance before the Bokstrike release

1. Build/typecheck `rift-wings-web` through its current workspace scripts; exercise the current Bokstrike test and head-geometry/audit commands from that branch. A library test pass does not validate the independent head pipeline.
2. Render all coat groups with ordinary and equipped feet across every base skin, left/right facing, both atlas profiles, mobile scale, walk/fly/attack/hit and action interruption. Check that legs remain beneath the hem and removing/changing a garment restores depths.
3. Review Super Saiyan, Samurai, PermaBull, Sneaker Head, Chikn Jockey, Cutlass, chains, Doctor Coq and both breastplates, including body/trait changes on a reused live rig.
4. Check actual Bokstrike pilot/helmet crops in both facings independently from full-rig previews. Verify gameplay hitboxes and identity mapping remain unchanged.
5. Attach screenshots and exact dependency/media versions to the game's own release review. Merge/deploy only through its release decision and existing workflow.

The library review gallery is `review.html`, with `?review=latest`, `?review=coats`, `?review=feedback` and `?review=traits`; select either species, profile, facing and pose. Offline comparisons and exact source/export hashes are retained in the asset review worktree under `.release/trait-review`.
