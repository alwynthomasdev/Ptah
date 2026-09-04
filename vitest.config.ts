import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // `as never`: @vitejs/plugin-vue types resolve against the root `vite`, which
  // is a different copy from the one bundled in `vitest/config`. Runtime is fine.
  plugins: [vue() as never],
  resolve: {
    alias: {
      '@renderer': r('./src/renderer'),
      '@main': r('./src/main'),
      '@core': r('./src/core'),
      '@storage': r('./src/storage'),
      '@shared': r('./src/shared'),
      '@models': r('./src/models'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
    // Renderer/component specs (added from M2) opt into jsdom via this glob.
    environmentMatchGlobs: [['test/renderer/**', 'jsdom']],
  },
});
