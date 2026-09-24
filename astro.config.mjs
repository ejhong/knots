// @ts-check
import { defineConfig } from 'astro/config';

// Served from GitHub Pages at https://ejhong.github.io/knots/
export default defineConfig({
  site: 'https://ejhong.github.io',
  base: '/knots',
  trailingSlash: 'ignore',
  output: 'static',
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  vite: {
    worker: { format: 'es' },
    build: { chunkSizeWarningLimit: 1200 },
  },
});
