import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        playground: fileURLToPath(new URL('./index.html', import.meta.url)),
        lesson: fileURLToPath(new URL('./lesson/index.html', import.meta.url)),
      },
    },
  },
});
