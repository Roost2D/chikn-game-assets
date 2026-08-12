# Load and host the asset pack

## Which artifact should I use?

- A browser/game server uses the runtime ZIP: generated atlas profiles, direct audio, and the immutable manifest.
- An editor or custom build pipeline uses the sources ZIP: classified originals and metadata.
- Application code installs the npm runtime helper: types, URL resolution, and stable IDs without media weight.

The three artifacts solve different deployment concerns and intentionally version independently from the engine.

## Host the runtime ZIP

Extract its contents into a directory named `runtime` without flattening the archive's internal directories. Supply the directory above `runtime/manifest.json`:

```ts
import { loadChiknPack } from '@chikn-game-assets/runtime';

const pack = await loadChiknPack({
  baseUrl: 'https://assets.example.com/chikn/vX.Y.Z/',
  profile: matchMedia('(min-resolution: 2dppx)').matches ? 'high' : 'default',
});
```

Alternatively pass an exact `manifestUrl`. No production host is embedded in the npm package.

Image manifest variants contain the atlas page, crop rectangle, original dimensions, scale, byte size, and SHA-256 SRI digest. Audio variants contain a direct MP3 path, byte size, and SHA-256 SRI digest. Use `@roost2d/assets` plus `@roost2d/pixi` for images and the runtime helper's `fetchAssetBytes` or `resolveAssetUrl` for audio; never construct paths or frame coordinates yourself.

Pin the artifact URL to an immutable version. If you mirror it, copy bytes unchanged and retain `CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md`, the applicable Asset Manifest, `REPOSITORY-LICENSING-NOTICE_PUBLIC.md`, and the exact attribution in `ATTRIBUTION.md`. Mirroring creates no new licence or sublicense.
