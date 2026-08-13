import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const showcaseDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(showcaseDir, '../..');
const linkedRoost2dPackages = [
  '@roost2d/assets',
  '@roost2d/chikn-rigs',
  '@roost2d/contracts',
  '@roost2d/pixi',
  '@roost2d/rig2d',
].map((packageName) => realpathSync(resolve(workspaceRoot, 'node_modules', packageName)));

export default defineConfig({
  base: './',
  server: {
    // Local release testing links the sibling Roost2D packages. Their rig JSON
    // is fetched at runtime, so Vite must permit those exact package roots.
    fs: { allow: [workspaceRoot, ...linkedRoost2dPackages] },
  },
  build: {
    target: 'es2022',
    // Keep the showcase portable when npm omits Lightning CSS's platform binary.
    cssMinify: false,
  },
});
