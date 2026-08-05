# Security policy

## Reporting a vulnerability

Report suspected vulnerabilities privately through
[GitHub Security Advisories](https://github.com/Roost2D/chikn-game-assets/security/advisories/new).
Please do not open a public issue for an unfixed vulnerability.

Include the affected version or commit, reproduction steps, and the impact you observed. Expect an
acknowledgement within 7 days and a status update within 30 days.

## Scope

In scope:

- `@chikn-game-assets/runtime`, the published Apache-2.0 helper package;
- the build, verification, and release scripts under `scripts/`;
- the GitHub Actions workflows and their supply-chain posture;
- the published documentation site and asset showcase.

Out of scope:

- rights, licensing, or permitted-use questions about Chikn, Roostr, or FarmLand artwork — see
  [COMMERCIAL_USE.md](COMMERCIAL_USE.md) and [docs/rights.md](docs/rights.md);
- vulnerabilities in the development server of a dependency that this project never runs in CI —
  these are tracked and reviewed in [docs/security-notes.md](docs/security-notes.md);
- findings that require an already-compromised maintainer machine or a manually altered committed
  manifest.

## Supported versions

The most recent release on the `latest` npm dist-tag receives fixes. Release candidates on `next`
are superseded rather than patched.

## Current posture

Controls, accepted advisories with review dates, and known gaps are documented in
[docs/security-notes.md](docs/security-notes.md).
