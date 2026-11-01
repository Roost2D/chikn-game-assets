# Roost Rift: adopt the shared trait assembly after Bokstrike

Schedule this separately after the Bokstrike integration. No Roost Rift code, dependency, live process or deployment was changed by the library release task. Use a dedicated worktree based on its then-current integration branch and read `Game/AGENTS.md`, `Game/llms.txt` and the relevant renderer context before editing.

Use the same exact stable pair as Bokstrike: all installed `@roost2d/*` packages at `0.8.0`, asset helper `@chikn-game-assets/runtime` at `0.6.2`. Registry release verification is recorded in the library release handoff. The existing immutable `0.6.1` media remains compatible; preserve the runtime host, media integrity lock and attribution.

Follow the shared rendering and compatibility guidance in the [Bokstrike handoff](./handoff-bokstrike-trait-assembly.md). In particular, retain original-image texture regions, Samurai's reversible clip, authored follower slots/depths, category-aware label resolution and actual NFT body skins. Remove compensating local offsets/flips/depth patches only where they duplicate the corrected shared behavior.

The core rules are 44 held props beneath the front wing; all 13 coats/breastplates above it with both leg branches beneath the torso/coat; and mounted Chikn Jockey anchored to the back during actions. Removing or changing an outfit must restore all original depths/clips. The library also includes all earlier V2 head/hair, footwear, necklace, egg/exhaust, multipart-arm and weapon corrections.

Inspect the actual consumer before assuming a package bump changes its visuals. Baseline presentation code includes `Game/src/ui/presentation/RiftClashRigStage.js`; other game-owned/legacy rigs may load their own definitions. Prefer the shared library's converted definitions and renderer for ordinary Chikn/Roostr traits. Port any unavoidable adapter behavior through the same contracts instead of maintaining another offset/layer table. Keep unique assembled skins separate.

Use Chikn V2 build1 and Roostr V2 build3 visuals as placement references, matching the builds in `Game/src/ui/HtmlUI/CodexController.js`. Never substitute legacy NFT renders. The asset repository has complete trait, outfit, reference and feedback review modes, including all base skins, both profiles/facings and motion poses.

Acceptance: update manifests/lockfile in lockstep, typecheck/build/test the affected renderer, verify every garment with feet across all base skins, both facings/profiles and animation/reaction transitions, then verify live skin/outfit switching and resource teardown. Recheck the named problem traits from the Bokstrike handoff and actual roster identities. Keep authoritative PvP simulation and hitboxes unchanged; this adoption concerns rendering metadata. Produce preview evidence for the Roost Rift release review before its own merge/deploy decision.
