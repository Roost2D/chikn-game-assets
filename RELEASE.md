# Release sequence

1. Build and verify both repositories on the candidate version.
2. Review the quick start, integration guide, `AGENTS.md`, `llms.txt`, npm package README, rights-manifest diff, and generated lineage.
3. Confirm official Chikn/Roostr/FarmLand visuals use `CHIKN-COMMUNITY-NONCOMMERCIAL`, approved project visuals use Apache-2.0, metadata remains Apache-2.0, and `excludedPaths` stay out of staged artifacts.
4. Publish all lockstep `@roost2d/*` release candidates with npm tag `next`.
5. Publish the matching `@chikn-game-assets/runtime` release candidate with npm tag `next`.
6. Run **Verify published release candidates** against both `next` tags.
7. Prepare the stable versions, rerun both complete release suites and the cross-repository consumer check, then publish stable npm packages with `latest`.
8. Create the versioned Chikn GitHub Release so the canonical source/runtime ZIPs and checksums are attached.

The asset CI performs exact generated-atlas byte comparison only on Linux. Windows and macOS validate decoded pixels and semantic manifest content. GitHub Pages deployment is manual and ships documentation/showcase output only. The npm helper contains no images.

The attached versioned source/runtime ZIPs are the canonical complete asset artifacts. GitHub's automatically generated source archive is not the complete canonical asset release.
