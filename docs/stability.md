# Stable IDs and compatibility

`0.1.0` is the first stable npm-channel and classified archive release.

- manifest asset IDs, aliases, bundle IDs, and runtime helper exports remain compatible throughout
  `0.1.x`;
- released atlas pages and manifests are immutable and identified by SHA-256 integrity records;
- protected Chikn artwork remains governed by
  `CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md` Version 1.1 and is not sublicensed by this repository;
- project code, schemas, rig metadata, documentation, and separately identified project artwork
  retain their stated Apache-2.0 terms;
- incompatible ID or schema changes require a new release line and migration notes.

The GitHub `github-release` environment is the human approval boundary for classified archives.
Configure required reviewers for that environment so a stable tag cannot publish protected content
without an explicit rights and manifest review.
