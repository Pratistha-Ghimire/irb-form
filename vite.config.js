import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Ensure dependencies are bundled correctly
    rollupOptions: {
      external: ['pdf-lib'], // Don't exclude pdf-lib if you want it bundled
    },
  },
});
