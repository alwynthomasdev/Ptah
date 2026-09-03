import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@renderer': r('./src/renderer'),
      '@shared': r('./src/shared'),
      '@models': r('./src/models'),
    },
  },
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
          resolve: {
            alias: {
              '@main': r('./src/main'),
              '@core': r('./src/core'),
              '@storage': r('./src/storage'),
              '@shared': r('./src/shared'),
              '@models': r('./src/models'),
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
            },
          },
          resolve: {
            alias: {
              '@shared': r('./src/shared'),
              '@models': r('./src/models'),
            },
          },
        },
      },
      renderer: {},
    }),
    renderer(),
  ],
  build: {
    outDir: 'dist',
  },
});
