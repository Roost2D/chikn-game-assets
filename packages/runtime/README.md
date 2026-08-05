# @chikn-game-assets/runtime

Apache-2.0 TypeScript helpers and a generated ID catalog for a separately hosted Chikn Game Assets release. This npm package contains no source images or atlas PNGs and does not grant rights to Chikn, Roostr, or FarmLand artwork.

```sh
npm install @chikn-game-assets/runtime
```

```ts
import { CHIKN_CONTENT_TERMS, loadChiknPack } from '@chikn-game-assets/runtime';

const pack = await loadChiknPack({
  baseUrl: 'https://cdn.example/chikn/v1.0.0/',
  profile: 'default',
});
const asset = pack.findAsset('chikn-flat/admiral');
console.log(CHIKN_CONTENT_TERMS.ownership);
```

`baseUrl` must point to the directory containing `runtime/manifest.json`; no production host is embedded. Use `@roost2d/assets` and `@roost2d/pixi` for integrity-checked loading and cropped Pixi textures.

Chikn, Roostr and FarmLand visual assets remain owned by their respective rights holder. Roost2D hosts the classified asset set with permission for community non-commercial use and grants no independent licence or sublicense. Commercial use requires a separate Chikn agreement.

Read the [community asset notice](https://github.com/Roost2D/chikn-game-assets/blob/main/CHIKN-COMMUNITY-ASSET-NOTICE.md), [attribution guidance](https://github.com/Roost2D/chikn-game-assets/blob/main/ATTRIBUTION.md), [commercial-use boundary](https://github.com/Roost2D/chikn-game-assets/blob/main/COMMERCIAL_USE.md), and [complete integration guide](https://github.com/Roost2D/chikn-game-assets/blob/main/INTEGRATION.md).
