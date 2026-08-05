# Traits and skins

A skin selects the base attachment set. Trait groups add one approved attachment at a time without making every part visible.

```ts
rig.applySkin('default');
rig.attachTrait('headwear', 'chikn/traits/headwear/cowboy-hat');
rig.attachTrait('torso', 'chikn/traits/torso/overalls');
rig.removeTrait('headwear');
```

Attachment groups are exclusive: selecting a new headwear trait hides the previous member of that group. This is the safe path for character builders. Use direct attachment visibility only for debugging or non-exclusive effect layers.

Export character choices as asset IDs and skin IDs, not atlas coordinates. IDs remain stable when atlases are repacked.
