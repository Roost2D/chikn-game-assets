# Animations and ownership

Animation clips target named rig slots rather than Pixi sprites. Rig definitions, transforms, attachment mappings, and animation timing are project-created Apache-2.0 metadata in `@roost2d/chikn-rigs`; they are not Chikn property.

The Chikn/Roostr visual layers referenced by those definitions remain protected visual content under Chikn's community non-commercial terms. Combining Apache-2.0 animation data with an image does not change the image's ownership or community-use terms.

```ts
rig.play('chikn.walk', { layer: 'base', speed: 1 });
rig.play('chikn.hit', { layer: 'reaction', repeat: 0 });
rig.setMirrored(true);
```

Named layers allow simultaneous locomotion and reactions. Stop/dispose the rig with its scene, and release its manifest-resolved textures separately.

Legacy animation JSON retained in the source archive is classified as Apache-2.0 metadata. Legacy rendered animation sprites and unrelated demo images are excluded from the public content artifacts.
