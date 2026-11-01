# Trait assembly review

Open `showcase/review.html` in a built showcase or `/review.html` on its dev server. This gallery renders complete characters through the shared library rather than moving standalone trait PNGs with CSS.

## Isolated local candidate

Build the companion Roost2D checkout first. In this asset checkout:

```powershell
npm ci
npm run build
npm run showcase:data
$env:ROOST2D_REVIEW_ROOT = 'C:\Users\sebdr\Repos\roost2d-trait-review'
npm run dev -w chikn-game-assets-showcase -- --host 127.0.0.1 --port 4273 --strictPort
```

The optional environment variable points Vite at that checkout's compiled library packages. It changes no installed package, game dependency, production URL, or other worktree. The gallery labels candidate and installed-library previews distinctly. Both atlas profiles use the same candidate layout metadata.

Choose either species, each of its base skins, category, facing, and setup/walk/fly/attack/hit pose. `Every trait` contains all 276 groups; `Complete outfits` covers every group in 108 fully equipped birds. `Official V2 visual comparisons` shows 107 source-linked V2 visuals covering 273 groups and all 19 skins. Three labels have no live match: Chikn Polygon Bling/Polygon Degen and Roostr MFD. Their ordinary trait previews remain available.

`Your feedback · V2 visual comparisons` covers the 95 reported traits. The 93 matched traits use their V2 visual's complete outfit and body skin; two Polygon necklaces retain ordinary previews without a live match. Open `/review.html?review=feedback`, optionally adding `&species=roostr` or `&trait=samurai`. The current layer policy puts 44 held torso props behind the front wing, while coat-like garments and both breastplates cover it. `config/trait-review-feedback.json` records those IDs separately from the multipart-arm corrections; “fresh chikn” maps to Roostr's `fresh-fish` trait.

`Latest corrections` at `/review.html?review=latest` shows Super Saiyan, Sneaker Head, Chikn Jockey, PermaBull, Doctor Coq and Golden Breastplate beside their V2 outfits. `Coats and breastplates` at `/review.html?review=coats` covers all 13 garment groups across both species. These modes also support the skin, facing, motion and atlas-profile controls.

`node scripts/export-trait-review.mjs` exports an owner-review HTML file under `.release/trait-review/index.html`, with embedded rendered previews and V2 images for offline comparison. This is a local review artifact, excluded from releases and Git. Use the live gallery for alternative skins, poses, facings and profiles. `node scripts/reference-feedback-sheets.mjs` caches V2 images and creates reference sheets; `node scripts/capture-trait-feedback.mjs` captures the candidate beside those exact images by category. `node scripts/capture-v2-corrections.mjs` creates the focused Cutlass/Samurai review with both facing directions and the saved previous candidate.

`node scripts/capture-latest-corrections.mjs` writes the six latest before/after comparisons, both facings and V2 references. Use its `--before` option only before changing a candidate. `node scripts/capture-coat-review.mjs` writes the 13-garment review. After exporting, `node scripts/verify-trait-review-export.mjs` checks every embedded image with HTTP blocked and records the exact source fingerprint and export hash in `review-status.json`.

## Sources and limitations

`config/trait-review-references.json` records token IDs, visual recipes, filenames and V2 image URLs. The source builds are `chiknV2/build1` and `roostrV2/build3`, matching `Game/src/ui/HtmlUI/CodexController.js` in Roost Rift. URLs come from the official API's `filename` field and those explicit build paths. Legacy `metadata.image` renders are excluded. Refresh coverage deliberately with `node scripts/fetch-trait-review-references.mjs`, or update the existing selections with `node scripts/refresh-trait-review-v2.mjs`. Network calls never run in normal builds/checks; scripts request only visual metadata.

Reference images are read only from the V2 builds and cached under `.release/trait-review/feedback/v2`, separate from legacy renders. The cache helper rejects legacy image paths. Missing Roostr chains reuse cropped official Chikn chain artwork in the same pack. Rear hair and front fringes likewise share existing textures. The renderer crops in original image coordinates, including trimmed/rotated atlas frames, without adding or editing source images. Segmented assemblies follow the head as one rigid image during action reactions. The owner authorized release with the general coat-leg correction on 1 November 2026; rights records remain unchanged.

Earlier review passes adjusted hair, second head, necklaces, eggs/exhausts, shorts, shoes, Panic Buy, Rosebud, shoulder armour, breastplates, perched jockey, muscles and claws. Held objects follow the foreground wing behind its feathers; rear arms follow the rear wing behind the body. V2 corrections restore Cutlass's right-pointing orientation and Broadsword's opposite source flip. Samurai's helmet offsets the base head's tilt, its smaller rear flap stays behind the head, and a reversible clip hides the comb under the helmet while preserving the face. Setup and animated previews remain subject to owner review, including the three unmatched traits.

The 1 November correction fits Super Saiyan and PermaBull to the V2 facial anchors and compensates for the rig's base head tilt. PermaBull's near horn renders in front of the head and the far horn behind it, without local mirroring. Sneaker Head aligns both shoes independently. The smaller Chikn Jockey sits on the back and uses anchored secondary motion so action reactions cannot bounce it away from its seat. All 13 coat-like outfits lower the front wing and both leg branches behind the garment while equipped; removal restores their original depths.

## Bokstrike handoff

Read-only integration inspection on 2026-10-31 found two distinct consumers in the Roost Rift repository:

- `Game/apps/rift-wings-web/src/bokstrike/render.ts` uses NFT-derived head crops from `data/bokstrike/heads.json`; `Game/scripts/bokstrike/heads.mjs` owns that pipeline. A library bump does not regenerate or correct those crops. Existing flight-helmet/head-crop work must continue independently.
- `Game/apps/rift-wings-web/src/game/RiderRig.ts` and `src/game/vendor/rosterCharacter.ts` use the shared full rig. Adopt all `@roost2d/*` packages at exact 0.8.0 and the asset helper at 0.6.2 in a separate integration branch. Keep the immutable 0.6.1 media lock; no source art changed.

For NFT-driven full rigs, use the NFT body rather than a hashed fallback when body metadata is available. Resolve traits with the new `resolveChiknTraitGroup(definition, category, nftLabel)` helper and report unknown labels instead of silently skipping them. `Hairy Old Man` and `Ropians Hat` are documented aliases for Roostr Beard and Grandpa. Do not mix the category of an otherwise matching name.

Before the next Bokstrike release, verify both facings and mobile scaling on its own head-crop pipeline, then test every equipped feet group on each base skin in any full-rig consumer, including walking/flying and reaction transitions. Carry the library preview approval and exact dependency version into that release review. Game source, head artifacts, ongoing processes and deployments remain untouched by this library release.

Read the current [Bokstrike integration handoff](./handoff-bokstrike-trait-assembly.md) first; it records the newer pilot/flight-head path inspected on 1 November. Use the separate [Roost Rift handoff](./handoff-roost-rift-trait-assembly.md) for its later adoption.
