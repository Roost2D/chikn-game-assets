# FarmLand

FarmLand assets include tiles, props, buildings, and 30 logical overlay frames reconstructed from the classified `overlays_atlas_high` source atlas.

Low source atlases are intentionally absent. The source overlay directory retains only the high atlas PNG/JSON pair; runtime default and high profiles are generated reproducibly from those logical frames.

```ts
const tile = pack.findAsset('farmland/tiles/grass');
const barnOverlay = pack.findAsset('farmland/overlays/barn-overlay');
```

Project a grid with `@roost2d/isometric`, sort objects by their projected depth key, and use source dimensions from the frame metadata to align building overlays. The showcase FarmLand tab demonstrates pan, zoom, picking, and tile replacement.
