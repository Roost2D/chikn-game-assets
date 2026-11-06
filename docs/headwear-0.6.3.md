# Headwear release and deferred game adoption

The companion Roost2D 0.9.0 release corrects covering hats on both species.
Every ordinary head trait has an explicit coverage policy: 108 audited groups,
64 with normalized polygon keep masks. Glasses, horns, hair and open accessories
retain their intended head visibility. Rear panels remain behind the face after
reusing a rig or changing skins. V2 build1 (Chikn) and build3 (Roostr) guide
placement; the owner's coverage rule determines comb concealment.

Use asset helper **0.6.3** and pin all installed `@roost2d/*` packages together
at **0.9.0**. Immutable **0.6.1** media is compatible. Source artwork, asset IDs,
rights classifications and licence records are unchanged.

The review gallery has `?review=headwear`, with species, skin, profile, facing,
pose and whole-bird/head-detail controls. The capture script writes an offline
comparison of all 108 traits, both directions and the matched V2 reference.
The verification script renders 20,420 frames across all 19 skins, both atlas
profiles, both facings and setup/walk/fly/attack/hit poses. It also checks face
pixels, rear-comb removal, mask restoration and sorted head layers. Unit tests
cover interruption, skin switching, hat-to-glasses changes and texture ownership.

```sh
node scripts/capture-headwear-review.mjs --before-only
node scripts/capture-headwear-review.mjs
node scripts/verify-headwear-matrix.mjs
```

The local preview server defaults to port 4274 for these captures. Set
`HEADWEAR_REVIEW_PORT` to another isolated preview port if needed, and
`ROOST2D_REVIEW_ROOT` to the library candidate. The baseline is released 0.8.0
rig metadata rendered through the review renderer. No NFT image is used as a
placement reference.

Bokstrike has two presentation paths. The live full-bird rig consumes the new
metadata directly; baked pilot heads must be regenerated with the polygon,
texture-region and follower-transform support. The prepared isolated patch
rebuilds 965 affected appearances and preserves the other 40 entries. It also
seats the two game-owned caps on all 19 bare-head appearances, preserving the
eligibility rule for all 5,620 bare-head birds in the 22,000-token catalogue.
The screenshot's Roostr Sesh Hat is native headwear, so it receives no default
aviator cap. Its nine baked appearances have separate before/after previews.

The Bokstrike patch is based on reviewed feature source
`e16580e3e1d8e7785c442ca274c77fec3156143a`. It is prepared for review only.
Do not change the running qualification, adopt its source, merge, deploy or
queue adoption when a process exits. After successful qualification and review,
validate the patch against that exact approved source. Inspect the competitive
execution closure: use scoped rendering/input/offline checks when unchanged;
obtain the required numerical qualification if execution changes. Roost Rift
receives a separate later adoption, using the same shared library masks.
