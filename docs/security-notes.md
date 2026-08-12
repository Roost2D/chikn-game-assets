# Security notes

Operational security posture for this repository. Report vulnerabilities via [SECURITY.md](https://github.com/Roost2D/chikn-game-assets/blob/main/SECURITY.md).

## Accepted dependency advisories

`npm audit` reports findings that `npm audit --omit=dev` does not. Every current finding is a
**development-server** issue reached only through `vitepress → vite → esbuild`. This repository runs
`vitepress build` and never `vitepress dev` in CI, so no workflow is exposed. The residual risk is a
developer running the docs dev server on an untrusted network.

VitePress 1.x pins Vite 5, so `npm audit` reports `fixAvailable: false` for all three. They are
accepted rather than force-patched; revisit when evaluating VitePress 2.x.

| Advisory | Package | Severity | Reviewed |
|---|---|---|---|
| [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — path traversal in optimized-deps `.map` handling | vite | high | 2026-08-05 |
| [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) — `server.fs.deny` bypass on Windows alternate paths | vite | high | 2026-08-05 |
| [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — dev server accepts requests from any website | esbuild | moderate | 2026-08-05 |

Review this table whenever Dependabot opens a VitePress or Vite pull request. The production gate is
`npm audit --omit=dev`, which must stay at zero.

## Secret scanning

**GitHub secret scanning and push protection are enabled** on the repository. They are the
authoritative control and cover provider token formats that a hand-written regex cannot.

`scripts/verify-public-tree.mjs` keeps a deliberately narrow offline backstop: it rejects PEM private
key blocks, `.env` files, binaries, key material by extension, and any path that is not tracked by
Git LFS when it should be. It is not a general secret scanner and should not grow speculative token
patterns, which produce false positives while still missing real formats.

## Release and supply-chain controls

- **Path containment.** Every manifest-controlled path is validated by `portablePathError` in
  `scripts/manifest-utils.mjs` before it is joined onto a real directory: no URL schemes, drive
  letters, absolute paths, backslashes, traversal segments, percent-encoded separators, or control
  characters. Release staging additionally proves realpath containment and refuses symlinks.
- **Workflow separation.** Every workflow that runs `npm ci` — and therefore arbitrary dependency
  lifecycle scripts — runs with `contents: read` and produces only an artifact. The privileged jobs
  (`npm publish`, `gh release create`, Pages deploy) never install dependencies, and each sits behind
  a GitHub environment gate.
- **Pinned actions.** All GitHub Actions are pinned to full commit SHAs.
- **Asset integrity.** `runtime/manifest.json` carries a SHA-256 SRI digest per atlas page and direct audio file.
  `@roost2d/assets` is the recommended cached loader; `@chikn-game-assets/runtime` also exposes
  `fetchAssetBytes` and `createChiknAssetCache`, which verify byte count and digest, enforce
  same-origin containment, and abort oversized responses.

## Known gaps

- `--provenance` publishing a pre-built tarball is unverified against the live registry. Confirm on
  the next real publish; if npm refuses it, fold the publish step back into the verify job rather
  than dropping provenance.
- Symlink rejection in `scripts/stage-release-sources.mjs` is not covered by an automated test,
  because creating symlinks on Windows requires Developer Mode. The lexical and prefix rules around
  it are covered in `scripts/test/manifest-utils.test.mjs`.
