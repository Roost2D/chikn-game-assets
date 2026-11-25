import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const showcaseDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(showcaseDir, '../..');
// Optional isolated library candidate. Does not modify installed packages or other games.
const reviewRoot = process.env.ROOST2D_REVIEW_ROOT;
const reviewPackages = ['assets', 'chikn-rigs', 'contracts', 'effects', 'pixi', 'rig2d'];
const linkedRoost2dPackages = [
  '@roost2d/assets',
  '@roost2d/chikn-rigs',
  '@roost2d/contracts',
  '@roost2d/pixi',
  '@roost2d/rig2d',
].map((packageName) => realpathSync(resolve(workspaceRoot, 'node_modules', packageName)));

export default defineConfig({
  base: './',
  define: { __ASSEMBLY_CANDIDATE__: JSON.stringify(Boolean(reviewRoot)) },
  resolve: {
    dedupe: ['pixi.js', 'gsap'],
    ...(reviewRoot ? { alias: reviewPackages.map((name) => ({ find: `@roost2d/${name}`, replacement: resolve(reviewRoot, 'packages', name, 'dist/index.js') })) } : {}),
  },
  server: {
    // Local release testing links the sibling Roost2D packages. Their rig JSON
    // is fetched at runtime, so Vite must permit those exact package roots.
    fs: { allow: [workspaceRoot, ...linkedRoost2dPackages, ...(reviewRoot ? [resolve(reviewRoot)] : [])] },
  },
  build: {
    rollupOptions: { input: { main: resolve(showcaseDir, 'index.html'), review: resolve(showcaseDir, 'review.html') } },
    target: 'es2022',
    // Keep the showcase portable when npm omits Lightning CSS's platform binary.
    cssMinify: false,
  },
});
