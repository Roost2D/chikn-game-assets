# Trait-aware brawler actions

The Chikn adapter resolves presentation from the same portable character recipe used by the builder. The game remains responsible for movement, hitboxes, damage, cooldowns, NPC decisions, and network authority.

The action catalog always contains Punch and Kick. An equipped blade, blunt tool, ranged item, or casting item changes Punch into the matching authored motion. Feet traits select a tailored flying spinning kick; paired art can articulate both feet while a combined image moves as one authored piece. Recognizable combat tails use the tail-strike foundation. `listChiknSpecials` returns only specials granted by equipped traits, so a character without one has no default special.

## Complete controlled-playback example

This example begins after the manifest-resolved textures have been loaded into the map used by `PixiRigFactory`. See [Render a Chikn](/render-chikn) for that loading step.

```ts
import {
  applyCharacterRecipe,
  listChiknSpecials,
  loadRoostrAnimations,
  loadRoostrRig,
  resolveChiknAction,
  type CharacterRecipeV1,
  type ResolvedChiknAction,
} from '@roost2d/chikn-rigs';
import { PixiProceduralEffect, PixiRigFactory } from '@roost2d/pixi';
import { RigActionController, RigRuntime } from '@roost2d/rig2d';

const definition = await loadRoostrRig();
const clips = await loadRoostrAnimations();
const factory = new PixiRigFactory(textures);
const rig = new RigRuntime(definition, factory, clips);
const recipe: CharacterRecipeV1 = {
  schema: 'roost2d.chikn-character/v1',
  species: 'roostr',
  skinId: definition.defaultSkinId!,
  traitGroupIds: ['head/laser-eye', 'torso/katana', 'feet/golden-feet'],
};
applyCharacterRecipe(rig, recipe, definition, clips);

const activeEffects: Array<{ startedAtMs: number; effect: PixiProceduralEffect }> = [];
const actions = new RigActionController(rig, {
  resumeLocomotion: () => rig.play('roostr.combat_idle', { layer: 'base' }),
});

function play(action: ResolvedChiknAction, authoritativeElapsedMs = 0) {
  for (const active of activeEffects.splice(0)) active.effect.destroy();
  const playback = actions.play(action.clip, {
    controlled: true,
    onCue({ cue }) {
      for (const descriptor of action.effects.filter(({ cueId }) => cueId === cue.id)) {
        activeEffects.push({
          startedAtMs: cue.timeMs,
          effect: PixiProceduralEffect.fromRig(descriptor, rig, factory.root),
        });
      }
    },
  });
  playback.sample(authoritativeElapsedMs);
  return playback;
}

// Capture an enemy direction when the action starts. Positive X means the fighter's current
// forward direction, regardless of whether the game has externally mirrored the rig.
const targetOffset = { x: 210, y: -24 };
const katanaPunch = resolveChiknAction(recipe, definition, 'punch', { targetOffset });
let playback = play(katanaPunch);

// The game can expose every available trait special in its own move-selection UI.
const laser = listChiknSpecials(recipe, definition)[0];
const serverActionAgeMs = 0; // Replace with the elapsed age supplied by your game protocol.
if (laser) playback = play(resolveChiknAction(recipe, definition, laser.id, { targetOffset }), serverActionAgeMs);

function renderFrame(deltaMs: number) {
  playback.advance(deltaMs);
  for (const active of [...activeEffects]) {
    if (active.effect.sample(playback.elapsedMs - active.startedAtMs)) {
      active.effect.destroy();
      activeEffects.splice(activeEffects.indexOf(active), 1);
    }
  }
}

function cancelAction() {
  actions.cancel();
  for (const active of activeEffects.splice(0)) active.effect.destroy();
}

function dispose() {
  cancelAction();
  actions.dispose();
  rig.dispose();
  factory.destroyRoot();
}
```

`advance()` emits every crossed presentation cue once and samples the exact cue pose before the callback. `sample()` is silent, including when scrubbing backward, so previews and exporters cannot accidentally replay live callbacks. An online game can create the action from its authoritative start time and sample the elapsed age immediately. Detached projectiles snapshot their release transform; following beams, slashes, exhaust, and trails continue to use their named origin.

Golden Egg, Very Fresh Egg, Floppy Disk, and Omelette effects clone the equipped attachment's actual Pixi texture, anchor, tint, scale, and release transform. The egg action turns the internal pose away, braces, releases beneath the tail at 400 ms, reaches presentation contact at 800 ms, regrows the equipped egg, and restores the setup pose at 1,000 ms. The game continues to own external facing, hit checks, and movement.

The Character Builder exposes Punch, Kick, selectable Special, a draggable/clickable local target, effects, pause, speed, scrubbing, and 24 fps action-sheet export. The separate 16-Fighter Preview demonstrates independent clocks, both external facings, opposing targets, interruption, and teardown.

`reports/trait-animation-coverage.json` accounts for every canonical trait asset and declared alternate, including the curated preset, exact origin, projectile source, and target convention. The generated Chikn and Roostr HTML contact sheets show all profiles at anticipation, release/contact, and recovery. Run `npm run animations:coverage:verify` after changing source selection, aliases, or rig metadata.
