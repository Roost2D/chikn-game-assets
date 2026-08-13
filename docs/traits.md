# Traits and skins

The source archive stores individual character images only under `traits-chikn` and `traits-roostr`; base/body components are categorized under `Base/<skin>/`. The retained Chikn/Roostr atlas pairs provide the complete source-atlas representation. Legacy flat and rig names are runtime aliases, so integrations should persist asset IDs rather than source paths.

A skin selects the base attachment set. Trait groups add one approved attachment set at a time without making every available part visible. Groups are exclusive by category.

```ts
import { applyCharacterRecipe, CHARACTER_RECIPE_SCHEMA } from '@roost2d/chikn-rigs';

applyCharacterRecipe(rig, {
  schema: CHARACTER_RECIPE_SCHEMA,
  species: 'roostr',
  skinId: 'MutantPurple',
  traitGroupIds: [
    'head/robocoq',
    'neck/stethoscope',
    'torso/shield',
    'feet/golden-greaves',
    'tail/foliage',
  ],
  animationId: 'roostr.walk',
}, definition, clips);
```

Replacement ownership is trait-specific. Tail traits replace the base tail, Feet traits replace both base feet, and complete-head traits such as Robocoq replace the base head. Overlay traits such as Stethoscope and Shield keep the body underneath. The hidden base bones stay active so replacement art follows every animation correctly.

Export `roost2d.chikn-character/v1` recipes with skin and attachment-group IDs, not atlas coordinates or independently scaled PNGs. IDs remain stable when atlases are repacked. See [Character generator template](/character-generator) for the complete workflow.
