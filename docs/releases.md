# Release integrity

Tagged releases publish three artifacts:

- a source archive containing classified source images, metadata, notices, and integration documentation, with `excludedPaths` omitted;
- a runtime archive containing the manifest, deterministic default/high atlas pages, integration guidance, and community-use notices;
- `SHA256SUMS` covering both archives.

The attached versioned source/runtime ZIPs are the canonical complete asset artifacts. GitHub's automatically generated source archive is not advertised as the complete asset release.

Verify an archive before mirroring it:

```sh
sha256sum --check SHA256SUMS
```

The runtime manifest records per-page SHA-256 integrity. The rights manifest records per-source hashes, while `reports/source-runtime-lineage.json` maps every logical runtime asset back to its classified source input. These are technical integrity records.

Staging fails if excluded project material such as `eggorithm.png` enters the source archive or runtime lineage. The npm helper is checked separately to ensure it contains no images.

Release candidates use npm tag `next`. After cross-repository verification, stable versions use `latest`.
