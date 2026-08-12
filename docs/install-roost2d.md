# Choose integration packages

For static sprites and FarmLand tiles:

```sh
npm install pixi.js @roost2d/assets @roost2d/pixi @chikn-game-assets/runtime
```

For animated Chikn/Roostr rigs, add:

```sh
npm install @roost2d/contracts @roost2d/rig2d @roost2d/chikn-rigs
```

For a complete game loop, input, isometric projection, and feedback, add only what you use:

```sh
npm install @roost2d/core @roost2d/input @roost2d/isometric @roost2d/effects @roost2d/audio
```

Every `@roost2d/*` dependency must use one exact lockstep version. `@chikn-game-assets/runtime` and the downloaded media artifact are separately versioned.

`@roost2d/tooling` is optional and Node-only:

```sh
npm install --save-dev @roost2d/tooling
```

Never import tooling from browser code. Start with the [copy-paste quick start](/quick-start).
