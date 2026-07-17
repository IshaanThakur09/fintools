import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        calculators: resolve(__dirname, 'calculators.html'),
        learn: resolve(__dirname, 'learn.html'),
        privacy: resolve(__dirname, 'privacy.html')
      }
    }
  }
});
