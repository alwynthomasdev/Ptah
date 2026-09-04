import { readFileSync } from 'node:fs';

/**
 * Reads `dataDir` out of Ptah's `userData/config.json`. Deliberately a
 * standalone, synchronous duplicate of `src/main/config.ts::loadConfig()`
 * rather than a shared abstraction — that function hard-depends on Electron's
 * `app` module, which this file must never import (see `src/mcp/server/**`'s
 * no-`electron` boundary in CLAUDE.md / `.claude/agents/mcp.md`).
 *
 * Unlike the GUI's `loadConfig()`, a missing/malformed config here is a hard
 * error: the MCP server has no sensible default `dataDir` to fall back to,
 * and a silent wrong-folder default would be worse than failing loudly.
 */
export function readConfiguredDataDir(configPath: string): string {
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    throw new Error(
      `Could not read Ptah config at "${configPath}". Open Ptah at least once so it can ` +
        'initialize its configuration, then try again.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Ptah config at "${configPath}" is not valid JSON. Open Ptah at least once so it can ` +
        're-initialize its configuration, then try again.',
    );
  }

  const dataDir = (parsed as { dataDir?: unknown } | null)?.dataDir;
  if (typeof dataDir !== 'string' || !dataDir) {
    throw new Error(
      `Ptah config at "${configPath}" has no "dataDir" set. Open Ptah at least once so it can ` +
        'initialize its configuration, then try again.',
    );
  }
  return dataDir;
}
