# Roostr rigs

Roostr uses the same renderer-neutral runtime, recipe, and loading flow as Chikn:

```ts
import {
  applyCharacterRecipe,
  CHARACTER_RECIPE_SCHEMA,
  loadRoostrAnimations,
  loadRoostrRig,
} from '@roost2d/chikn-rigs';
import { RigRuntime } from '@roost2d/rig2d';

const definition = await loadRoostrRig();
const clips = await loadRoostrAnimations();
const roostr = new RigRuntime(definition, displayFactory, clips);

applyCharacterRecipe(roostr, {
  schema: CHARACTER_RECIPE_SCHEMA,
  species: 'roostr',
  skinId: 'MutantPurple',
  traitGroupIds: ['head/robocoq', 'feet/golden-greaves', 'tail/foliage'],
  animationId: 'roostr.walk',
}, definition, clips);
```

Keep Chikn and Roostr save data namespaced by species even when trait labels are similar. Their slot layouts and approved source IDs are independent. Use the [character generator template](/character-generator) to export the recipe, transparent reference, animation sheet, and frame metadata.
