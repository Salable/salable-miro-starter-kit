import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

dns.setDefaultResultOrder('verbatim');

// Picks up ALL .html files in the project root as multi-page entry points
const allHtmlEntries = fs
  .readdirSync('.')
  .filter((file) => path.extname(file) === '.html')
  .reduce<Record<string, string>>((acc, file) => {
    acc[path.basename(file, '.html')] = path.resolve(__dirname, file);
    return acc;
  }, {});

export default defineConfig({
  build: {
    rollupOptions: {
      input: allHtmlEntries,
    },
  },
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/salable-api': {
        target: 'https://salable.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/salable-api/, '/api'),
      },
    },
  },
});
