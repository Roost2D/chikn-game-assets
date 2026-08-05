# Mini-game recipe

A small asset-driven game needs four independent pieces:

1. Use `@roost2d/core` for scene lifetime and fixed-step simulation.
2. Use `@roost2d/assets` and `@roost2d/pixi` to lazily load manifest frames.
3. Use `@roost2d/input` to map keyboard, pointer, touch, and gamepad to named actions.
4. Use `@roost2d/effects` and `@roost2d/audio` for collectible feedback.

Keep collection and scoring in the fixed update. Interpolate only display positions during render. Unload the scene bundle and dispose listeners when returning to the menu.

The showcase's Collection Run tab is a complete browser example with keyboard, touch/pointer, and gamepad movement, resettable scene state, and effect feedback.
