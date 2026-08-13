# Render and animate a Chikn rig

The image pack and rig metadata are separate. Chikn/Roostr visual artwork is protected content; the rig definitions, transforms, attachment mappings, and animation timing in `@roost2d/chikn-rigs` are project-created Apache-2.0 metadata.

Install the rig stack in addition to the [quick-start packages](/quick-start):

```sh
npm install @roost2d/contracts @roost2d/rig2d @roost2d/chikn-rigs
```

After creating the `PixiAssetLoader` named `textures` in the quick start:

```ts
import { applyCharacterRecipe, CHARACTER_RECIPE_SCHEMA, loadChiknAnimations, loadChiknRig } from '@roost2d/chikn-rigs';
import { PixiRigFactory } from '@roost2d/pixi';
import { RigRuntime } from '@roost2d/rig2d';
import type { Texture } from 'pixi.js';

const [definition, clips] = await Promise.all([
  loadChiknRig(),
  loadChiknAnimations(),
]);

const textureMap = new Map<string, Texture>();
for (const assetId of new Set(definition.attachments.map(({ texture }) => texture.assetId))) {
  textureMap.set(assetId, await textures.load(assetId));
}

const factory = new PixiRigFactory(textureMap);
const rig = new RigRuntime(definition, factory, clips);
factory.root.position.set(320, 320);
host.app.stage.addChild(factory.root);
applyCharacterRecipe(rig, {
  schema: CHARACTER_RECIPE_SCHEMA,
  species: 'chikn',
  skinId: 'Celestial',
  traitGroupIds: ['head/admiral', 'tail/golden-plumage'],
  animationId: 'chikn.walk',
}, definition, clips);
```

The texture references already carry source-art-to-rig layout scale, and legacy attachments declare whether depth belongs to their transform bone. `RigRuntime` resolves a slot animation and follower parent against the active body skin before any trait overlay. Do not add `0.1219`, `0.0929`, manual trait parenting, or sprite-to-bone z-order transfers in application code.

Trait groups come from `definition.attachmentGroups`. Use a character recipe for builders so only one group occupies a category and replacement traits hide their owned base feather slots. Mirror and tint at the rig level so every attachment stays aligned. The [Character generator template](/character-generator) documents recipe and animation-sheet export.

During teardown call `rig.dispose()`, remove/clear the loaded textures, and destroy the factory root. Do not copy rig metadata into the image-rights class: the visual inputs remain under Chikn's community terms while the animation system is separately Apache-2.0.
