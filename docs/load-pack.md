# Load and host the asset pack

## Which artifact should I use?

- A browser/game server uses the runtime ZIP: generated atlas profiles plus the immutable manifest.
- An editor or custom build pipeline uses the sources ZIP: classified originals and metadata.
- Application code installs the npm runtime helper: types, URL resolution, and stable IDs without image weight.

The three artifacts solve different deployment concerns and intentionally version independently from the engine.

## Host the runtime ZIP

Extract it without flattening directories. Supply the directory above `runtime/manifest.json`:

```ts
import { loadChiknPack } from '@chikn-game-assets/runtime';

const pack = await loadChiknPack({
  baseUrl: 'https://assets.example.com/chikn/vX.Y.Z/',
  profile: matchMedia('(min-resolution: 2dppx)').matches ? 'high' : 'default',
});
```

Alternatively pass an exact `manifestUrl`. No production host is embedded in the npm package.

The manifest variant path contains the atlas page, crop rectangle, original dimensions, scale, byte size, and SHA-256 SRI digest. Use `@roost2d/assets` plus `@roost2d/pixi`; never construct frame coordinates yourself.

Pin the artifact URL to an immutable version. If you mirror it, copy bytes unchanged and retain `CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md`, the applicable Asset Manifest, `REPOSITORY-LICENSING-NOTICE_PUBLIC.md`, and the exact attribution in `ATTRIBUTION.md`. Mirroring creates no new licence or sublicense.
