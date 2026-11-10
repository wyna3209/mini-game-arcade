import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const pages = { arcade: resolve('index.html') };
function collectGames(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) collectGames(path);
    else if (entry.name.endsWith('.html')) pages[relative(process.cwd(), path).replace(/[^a-zA-Z0-9]/g, '_')] = path;
  }
}
collectGames(resolve('games'));

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: pages,
    },
  },
});
