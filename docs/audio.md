# Audio assets

The repository includes the official EggCatch/Gravy Chikn audio corpus under `sources/audio/`. The 79 original MP3 files were imported from the Chikn team's `EggCatch/Assets/gravy/Audio` source tree on 2026-08-12. The Chikn team authorized their inclusion in this repository; they use the same `CHIKN-COMMUNITY-NONCOMMERCIAL` classification, ownership fields, attribution, and commercial-use boundary as the other protected Chikn content.

Unity `.meta` files are intentionally excluded. The source paths, per-file SHA-256 values, rights classification, and runtime mapping are recorded by repository-native generated metadata instead:

- `manifests/rights-manifest.json` records every source MP3, its exact SHA-256 value, and its rights classification.
- `reports/source-runtime-lineage.json` maps each stable audio ID to the original source path and runtime file.
- `runtime/manifest.json` publishes each file as `kind: "audio"`, `mediaType: "audio/mpeg"`, with byte count and SHA-256 SRI integrity.
- `packages/runtime/catalog/asset-ids.json` includes the stable IDs after a build.

## Stable IDs and paths

Audio IDs use lowercase kebab case while retaining source subfolders:

| Source | Asset ID | Runtime path |
| --- | --- | --- |
| `sources/audio/bok_gark_01.mp3` | `audio/bok-gark-01` | `runtime/audio/bok-gark-01.mp3` |
| `sources/audio/ui select.mp3` | `audio/ui-select` | `runtime/audio/ui-select.mp3` |
| `sources/audio/Songs/CF - Pre-game Loop_01.mp3` | `audio/songs/cf-pre-game-loop-01` | `runtime/audio/songs/cf-pre-game-loop-01.mp3` |

Do not derive an ID from a filename in application code. Resolve it through the manifest or generated catalog so aliases and future compatibility rules remain centralized.

Both runtime profiles point to the same MP3 bytes; image profile selection does not transcode or resample audio.

## Loading

```ts
import { fetchAssetBytes, loadChiknPack } from '@chikn-game-assets/runtime';

const pack = await loadChiknPack({
  baseUrl: new URL('/vendor/chikn-vX.Y.Z/', window.location.origin),
  profile: 'default',
});
const bytes = await fetchAssetBytes(pack, 'audio/bok-gark-01');
```

Consumers may pass the resolved URL to their normal Web Audio, HTML Audio, or `@roost2d/audio` integration. Redistribution must retain the release's Chikn licence, asset manifest, and attribution notices.
