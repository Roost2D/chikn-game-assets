# Changelog

## 0.3.0 - 2026-08-13

- Replace the raw two-sprite Character Builder with canonical Chikn/Roostr rig composition.
- Support one trait per category, tail/feet base-feather replacement, head overlays, portable recipe export, transparent reference PNGs, and sampled animation sheets.
- Enforce tail, torso, neck, head, and feet depth order; correct single-image feet placement before replacing both feet.
- Use a closed symmetric two-step walk plus seamless ping-pong loops for slowed/fly, keep action clips as one-shots, and export complete loop cycles.
- Add a root `npm run builder:dev` command and local builder startup documentation.
- Prepare the showcase for the Roost2D `0.2.0` character-recipe and seamless-loop APIs.

## 0.2.0 - 2026-08-12

- Add the official EggCatch/Gravy Chikn audio corpus as 79 protected MP3 assets.
- Publish stable `audio/*` manifest IDs with SHA-256 integrity, rights records, and source-to-runtime lineage.
- Exclude Unity `.meta` sidecars from the repository and release artifacts.

## 0.1.0

First stable-channel release of `@chikn-game-assets/runtime` and the classified Chikn asset pack.

- Deterministic default/high runtime atlases with integrity and source-lineage manifests.
- Stable Chikn, Roostr, FarmLand, trait, rig, and unique-character IDs.
- Apache-2.0 runtime helpers with explicit non-commercial Chikn content terms and attribution data.
- Reproducible source/runtime ZIPs, portable checksums, trusted-publisher provenance, and Roost2D cross-verification.

See [Stable IDs and compatibility](docs/stability.md) and [Release integrity](docs/releases.md).
