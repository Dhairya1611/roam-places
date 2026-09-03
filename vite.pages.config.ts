import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryBase = process.env.VITE_PAGES_BASE || '/roam-places/';

export default defineConfig({
  base: repositoryBase,
  root: resolve(process.cwd(), 'static-pages'),
  publicDir: resolve(process.cwd(), 'public'),
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': resolve(process.cwd(), '.') } },
  plugins: [
    react(),
    {
      name: 'github-pages-spa-fallback',
      closeBundle() {
        copyFileSync('dist-pages/index.html', 'dist-pages/404.html');
      },
    },
  ],
  build: {
    outDir: resolve(process.cwd(), 'dist-pages'),
    emptyOutDir: true,
    rolldownOptions: {
      input: resolve(process.cwd(), 'static-pages/index.html'),
    },
  },
});
