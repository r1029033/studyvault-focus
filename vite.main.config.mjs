import { defineConfig } from 'vite';

// Native Node modules must stay external so Forge can unpack their .node files.
export default defineConfig({
  build: { rollupOptions: { external: ['better-sqlite3'] } },
});
