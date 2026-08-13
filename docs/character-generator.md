# Character generator template

Use the rig as the character model. Do not center, resize, and stack arbitrary files from `traits-chikn` or `traits-roostr`: those PNGs have different trimmed bounds, some contain multiple ordered pieces, and replacement traits must hide specific base feathers.

The showcase **Character Builder** is the reference implementation. It uses the released manifest and the same public Roost2D path as a game:

1. choose `chikn` or `roostr`;
2. choose one base skin or assembled unique;
3. choose at most one group in each trait category;
4. apply the exported recipe to `RigRuntime`;
5. play or seek a named rig clip;
6. export the transparent reference PNG or a row-major animation sheet.

## Start the builder locally

From the `chikn-game-assets` repository root:

```powershell
npm install
npm run builder:dev
```

Then open [http://127.0.0.1:4173/#builder](http://127.0.0.1:4173/#builder). The command rebuilds the showcase catalog before starting Vite. Stop it with `Ctrl+C`.

## Portable recipe

```json
{
  "schema": "roost2d.chikn-character/v1",
  "species": "roostr",
  "skinId": "MutantPurple",
  "traitGroupIds": [
    "head/robocoq",
    "neck/stethoscope",
    "torso/shield",
    "feet/golden-greaves",
    "tail/foliage"
  ],
  "animationId": "roostr.walk",
  "mirrored": false,
  "tint": 16777215,
  "renderScale": 1
}
```

The recipe is the handoff between a UI, an AI coding assistant, a game, and an exporter. It deliberately contains no source filenames, pixel offsets, atlas rectangles, or magic scale values.

## Replacement versus overlay

`definition.attachmentGroups[groupId].replacesSlotIds` is authoritative.

- Tail traits own `Tail`.
- Feet traits own `LegFoot A` and `LegFoot B`.
- Complete-head traits such as Robocoq own `Head`.
- Hats, combs, necklaces, shields, and held items normally remain overlays.

Depth is also part of the rig contract. Replacement tails temporarily lift their hidden `Tail` transform above the body torso. Torso traits, including Cutlass, render above the torso but below the foreground wing; applications must not patch these depths after composition.

When a replacement is active, only the base sprite is hidden. Its bone remains the animation target, and the trait follows that bone. This prevents doubled feet, old tail feathers behind a new tail, or a default head showing through a complete replacement without disconnecting the trait during movement.

## Animation-sheet export

The builder samples the selected Roost2D clip at 12 deterministic times. `walk`, `slowed`, and `fly` use a complete forward-and-back ping-pong cycle, so their last pose joins their first pose without a reset. Actions such as attack, hit, spawn, and death are intentional one-shots. Use the two explicit animation export buttons to download:

- a transparent PNG sheet in a 4-column, 3-row layout;
- a `roost2d.sprite-sheet/v1` JSON file containing the recipe, frame rectangles, clip duration, and sample times.

PNG and JSON are separate user gestures so mobile Safari does not block the second file as an unsolicited download.

This sheet is a deterministic rendering of the selected rig. If an external generative model is used to create more elaborate poses, use the exported transparent reference as the identity/style input and the JSON recipe as the immutable trait specification. Treat every generated frame as new derivative artwork that still follows the Chikn community content terms.

## Minimum acceptance check

Build the purple Roostr example above and verify:

- no `MutantPurple_Head` is visible beneath Robocoq;
- no `MutantPurple_LegFootA/B` is visible with Golden Greaves;
- no `MutantPurple_Tail` is visible behind Foliage;
- Foliage renders above the purple torso;
- Stethoscope and Shield remain visible over the torso;
- all selected traits stay attached through `walk`, `fly`, `attack`, and `hit`.

For Chikn, also combine Cutlass with any tail trait and verify the tail is above the torso while Cutlass remains below the foreground wing.
