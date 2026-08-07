const RC_VERSION_PATTERN = /^\d+\.\d+\.\d+-rc\.\d+$/;

export function assertRcReleaseVersion(rootVersion, runtimeVersion) {
  if (!RC_VERSION_PATTERN.test(rootVersion)) {
    throw new Error(`Refusing to assemble an unexpected release version: ${rootVersion}`);
  }
  if (runtimeVersion !== rootVersion) {
    throw new Error(`Root and runtime package versions must match: ${rootVersion} !== ${runtimeVersion}`);
  }
  return rootVersion;
}
