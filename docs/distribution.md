# Distribution and artifact rationale

The release is deliberately split instead of publishing the protected image and audio corpus inside npm.

## npm helper

`@chikn-game-assets/runtime` is Apache-2.0 code. It contains TypeScript declarations, manifest helpers, an ID catalog, and community-use notices. It contains no PNG/JPEG/WebP/MP3/ZIP files and never chooses a production host or grants Chikn rights.

## Runtime ZIP

The runtime ZIP is what a game mirrors to static hosting or a CDN. Its contents are mounted or extracted under the consumer's `runtime/` directory. It contains the public notices, a versioned manifest, and two deterministic profiles:

- `default`: 2048px pages, half-scale images, 64 MiB target GPU budget;
- `high`: 4096px pages, full-scale images, 256 MiB target GPU budget.

Bundles are grouped by content family and lazy by default. SHA-256 and frame metadata make it possible to verify every downloaded atlas and render only logical crops.

Protected MP3 files live under `runtime/audio/`. Both profiles reference the same immutable bytes, and every audio manifest entry includes its byte count, SHA-256 SRI value, rights ID, and source-lineage record. The archive also carries `reports/source-runtime-lineage.json`, `INTEGRATION.md`, and `docs/audio.md` so consumers can audit provenance and integrate the audio without consulting the repository checkout.

## Sources ZIP

The sources ZIP is for editors, custom atlas pipelines, provenance review, and source-to-runtime audits. It is staged from classified rights-manifest entries rather than zipping the repository wholesale. Its character corpus contains the retained Chikn/Roostr source atlas pairs and one deduplicated set of high-resolution individual trait/base files; its audio corpus contains the original MP3 files without Unity `.meta` sidecars. Files under `excludedPaths`, including `eggorithm.png`, cannot enter it; classified Apache-2.0 project artwork such as `water_swim_ring_coq.png` can.

This arrangement lets a consumer pin an immutable media release, host it on consumer-controlled infrastructure, cache it independently from JavaScript, and upgrade the engine without downloading the content again. Mirroring must retain the unmodified Chikn Community Asset Pack Non-Commercial Licence and applicable Asset Manifest; it creates no new rights.
