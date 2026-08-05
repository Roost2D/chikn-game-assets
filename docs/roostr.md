# Roostr rigs

Roostr uses the same renderer-neutral runtime and loading flow as Chikn:

```ts
import { createRoostrRig } from '@chikn-game-assets/runtime';

const roostr = await createRoostrRig({
  loadDefinition: () => fetch('/rigs/roostr.json').then((r) => r.json()),
  create: createRigRuntime,
  skin: 'default',
  traits: ['headwear/crown'],
  applySkin: (runtime, id) => runtime.applySkin(id),
  attachTrait: (runtime, id) => runtime.attachTraitId(id),
});
```

Keep Chikn and Roostr save data namespaced by species even when trait labels are similar. Their slot layouts and approved source IDs are independent.
