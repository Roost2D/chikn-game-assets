import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // Keep the showcase portable when npm omits Lightning CSS's platform binary.
    cssMinify: false,
  },
});
