# Roost Rift headwear adoption — later task

Adopt after Bokstrike, in a separate checkout and release review. Use all
installed `@roost2d/*` packages at **0.9.0**, asset helper **0.6.3**, and existing
immutable **0.6.1** media. Keep the game's asset host, integrity checks and
attribution. This library task changes no Roost Rift game source or deployment.

Use the shared ordinary-trait definitions and renderer. Preserve
`slotClipPolygons`, original-image texture regions, follower slots and depths
through any adapter. A polygon keeps its normalized interior on the underlying
slot sprite and overrides a rectangle on that slot. It never clips the hat
overlay or mutates shared textures. Rebuild flattened sprites with these same
rules; a library update cannot repair an image already baked without masks.

All 108 ordinary head groups have explicit coverage policies. Covering hats
conceal the comb; hair, glasses, horns and genuinely open accessories retain
appropriate visibility. Use Chikn V2 build1 / Roostr V2 build3 as placement
references and the owner's coverage rule for concealment. Unique artwork stays
on its separate path and is regression-tested rather than repainted.

Verify all 19 skins, both profiles/facings, movement and reaction poses, hat
removal, glasses switching, skin changes, interrupted animation and teardown.
Check Sesh Hat, Samurai, crowns, caps and rear panels on a reused live rig.
Retain the existing coat/wing/leg and held-prop policies. Record previews and
exact source fingerprints before the game's separate adoption decision.
