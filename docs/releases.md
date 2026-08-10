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

## Release operator runbook

Publishing is never part of an ordinary build or verification task.

### One-time registry bootstrap

`@chikn-game-assets/runtime` does not yet exist on npm. npm requires the package to exist before a
trusted publisher can be attached, so the first `0.1.0-rc.0` publish is an authenticated local
bootstrap:

1. Confirm that the npm account has 2FA and publish rights for the
   `@chikn-game-assets` scope.
2. Run `npm login`, `npm whoami`, and `npm run release:verify`.
3. Run `npm pack -w @chikn-game-assets/runtime --pack-destination dist-pack`.
4. Publish the printed tarball filename with
   `npm publish dist-pack/<filename>.tgz --access public --tag next`.

The bootstrap has no provenance because it runs outside GitHub's OIDC environment. Once the package
exists, configure this trusted publisher in its npm package settings:

- GitHub owner/repository: `Roost2D/chikn-game-assets`
- workflow filename: `publish.yml`
- GitHub environment: `npm-publish`
- allowed action: `npm publish`

Routine releases use the **Publish asset runtime** workflow and need no `NPM_TOKEN` or local npm
login. The workflow publishes the already verified tarball from a minimal OIDC job.

### Release candidate

1. Publish the lockstep Roost2D packages to `next` first.
2. Update this repository and `@chikn-game-assets/runtime` to an `X.Y.Z-rc.N` version, push
   `main`, and wait for every CI matrix job to pass.
3. Dispatch **Publish asset runtime** with `tag=next`.
4. Dispatch **Cross-repository verification** with both tags set to `next`.
5. After those checks pass, create and push the matching `vX.Y.Z-rc.N` tag if a GitHub Release of
   the classified source/runtime archives is wanted.

### Stable release

1. Give both repositories new versions without prerelease suffixes and pass their main-branch CI.
2. Publish Roost2D with `tag=latest`.
3. Dispatch **Publish asset runtime** with `tag=latest`; its preflight installs the exact packed
   stable runtime candidate alongside Roost2D `latest` before publishing that same tarball.
4. Dispatch **Cross-repository verification** again with both tags set to `latest`.
5. Push the stable `vX.Y.Z` tag only after the npm checks pass; that tag creates the versioned
   sources ZIP, runtime ZIP, and `SHA256SUMS` GitHub Release.

Configure required human reviewers on the `npm-publish` and `github-release` GitHub environments.
The latter is the explicit rights-manifest and classified-archive approval boundary.

An npm name/version pair cannot be reused. Stable publication therefore requires a new version, not
moving `latest` onto an existing `-rc` package version.
