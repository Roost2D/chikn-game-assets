# Distribution and artifact rationale

The release is deliberately split instead of publishing approximately 100 MB of images inside npm.

## npm helper

`@chikn-game-assets/runtime` is Apache-2.0 code. It contains TypeScript declarations, manifest helpers, an ID catalog, and community-use notices. It contains no PNG/JPEG/WebP/ZIP files and never chooses a production host or grants Chikn rights.

## Runtime ZIP

The runtime ZIP is what a game mirrors to static hosting or a CDN. It contains the public notices, a versioned manifest, and two deterministic profiles:

- `default`: 2048px pages, half-scale images, 64 MiB target GPU budget;
- `high`: 4096px pages, full-scale images, 256 MiB target GPU budget.

Bundles are grouped by content family and lazy by default. SHA-256 and frame metadata make it possible to verify every downloaded atlas and render only logical crops.

## Sources ZIP

The sources ZIP is for editors, custom atlas pipelines, provenance review, and source-to-runtime audits. It is staged from classified rights-manifest entries rather than zipping the repository wholesale. Files under `excludedPaths`, including `eggorithm.png`, cannot enter it.

This arrangement lets a consumer pin an immutable image release, host it on consumer-controlled infrastructure, cache it independently from JavaScript, and upgrade the engine without downloading the content again. Mirroring does not create a new licence or expand Chikn's existing community permission.
