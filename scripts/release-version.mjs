const RELEASE_VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-rc\.(?:0|[1-9]\d*))?$/;

export function assertReleaseVersion(rootVersion, runtimeVersion) {
  if (!RELEASE_VERSION_PATTERN.test(rootVersion)) {
    throw new Error(`Refusing to assemble an unexpected release version: ${rootVersion}`);
  }
  if (runtimeVersion !== rootVersion) {
    throw new Error(`Root and runtime package versions must match: ${rootVersion} !== ${runtimeVersion}`);
  }
  return rootVersion;
}
