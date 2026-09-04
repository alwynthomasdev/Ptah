// Bundles the standalone MCP server (src/mcp/server/**) into a single
// self-contained CJS file. Deliberately not folded into vite-plugin-electron's
// `simple()` config: that's shaped for {main, preload, renderer} and wired
// into `npm run dev`'s hot-reload loop, while this entry point is only ever
// invoked externally (spawned by Claude Code/Desktop), never loaded by the
// running window.
import { build } from 'esbuild';
import path from 'node:path';

const r = (p) => path.resolve(p);

await build({
  entryPoints: ['src/mcp/server/index.ts'],
  outfile: 'dist-electron/mcp/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  alias: {
    '@core': r('src/core'),
    '@storage': r('src/storage'),
    '@shared': r('src/shared'),
    '@models': r('src/models'),
  },
});

console.log('Built dist-electron/mcp/index.js');
