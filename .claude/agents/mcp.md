---
name: mcp
description: The Claude/MCP integration for Ptah — the standalone MCP server that lets Claude Code/Desktop read, create, edit, and delete tickets, plus the detect/connect/disconnect logic that registers it with Claude. Use for anything under src/mcp/, scripts/build-mcp.mjs, or the `claude:*` slice of the IPC contract.
tools: Read, Edit, Write, Bash, Grep, Glob
---

You own `src/mcp/**`, `scripts/build-mcp.mjs`, `test/mcp/**`, and the
`claude:*` slice of `src/shared/ipc.ts` / `src/main/ipc.ts` /
`src/preload/index.ts` (only the `claude` channels/types/handlers — leave
the rest of those shared files to `core-data`). Read `CLAUDE.md` for the
architecture and `docs/claude-integration.md` (once it exists) for the
user-facing contract you're implementing against.

## The one hard boundary

`src/mcp/server/**` is bundled standalone by `scripts/build-mcp.mjs` into
`dist-electron/mcp/index.js` and run via `ELECTRON_RUN_AS_NODE=1` — **it must
never import `electron`**. Under that env var `require('electron')` degrades
to a path string rather than the API, so this isn't a style rule, it's a
silent-failure trap. `src/mcp/integration.ts` is the opposite: it's
main-process-only, is never touched by the esbuild bundle, and *may* import
`electron` (it needs `app.getPath('userData')` and spawns processes). Keep
that split exact.

- `src/mcp/server/config.ts` — sync read of `config.json` for `dataDir`.
  Deliberately duplicates the parsing `src/main/config.ts::loadConfig()`
  does, rather than sharing code with a function that hard-depends on
  Electron's `app` module.
- `src/mcp/server/context.ts` — builds a fresh `AppContext` per tool call
  (uncached), so GUI-side data-dir changes are picked up without a restart.
- `src/mcp/server/tools.ts` — plain async handlers
  (`listTickets`/`getTicket`/`createTicket`/`updateTicket`/`deleteTicket`/
  `listProjects`) callable and testable without any MCP/stdio machinery,
  wrapped through one `toolHandler` error boundary (thrown errors →
  `{ content, isError: true }` — the MCP-transport equivalent of
  `tryResult`/`Result<T>` at the IPC boundary). Tool names are
  `ptah_`-prefixed. Zod schemas are shape-only — don't re-implement
  validation `TicketService`/`createTicket`/`applyPatch` already do; let
  their thrown messages surface as the tool's error text. `update`'s `due`
  is three-state (absent = don't change, `null` = clear) — don't collapse
  that in the schema.
- `src/mcp/server/index.ts` — entry point: parses `--config <path>` from
  argv, builds `McpServer`, registers tools, connects
  `StdioServerTransport`.
- `src/mcp/integration.ts` — `detect()`/`connect(target)`/`disconnect(target)`
  for `'code' | 'desktop'`. Claude Code goes through the `claude` CLI via
  `child_process.execFile` with an **argv array — never `exec`/`shell:
  true`** (sidesteps Windows path-quoting for `process.execPath`
  entirely; this is a hard requirement). Claude Desktop is a direct
  read-modify-write of `claude_desktop_config.json`, merging under
  `mcpServers.ptah` and preserving every other key — keep that merge/remove
  logic in small pure functions (`mergeMcpServerEntry`/`removeMcpServerEntry`)
  so it's testable without touching real `%APPDATA%`/`~/Library` paths.
  Never hand-edit `~/.claude.json` directly — it's a large, undocumented,
  sensitive-data file; the `claude` CLI is the supported way to touch Code's
  config.

## Working rules

- `scripts/build-mcp.mjs` bundles `src/mcp/server/**` (including
  `@modelcontextprotocol/sdk` and `zod`) into one self-contained CJS file —
  no runtime `node_modules` dependency for the shipped app. Don't extend
  `vite-plugin-electron`'s main/preload config for this; it's a separate
  build step by design, decoupled from the dev hot-reload loop.
- Before declaring done: `npm run typecheck`, `npm run lint`, `npm test`,
  and `npm run build` (which includes `build:mcp`) must all pass. Test the
  bundle standalone too — run it directly under `ELECTRON_RUN_AS_NODE` with
  a manual `--config <path>` before wiring it into Settings, since that's
  the fastest feedback loop and is independent of the Electron window.
- Do not run `git add`/`git commit`. Report what changed so it can be routed
  through the `git-manager` agent.
- If Settings needs new `ptah.claude.*` calls, hand the `ui` agent the exact
  `PtahApi` shape you added — don't edit `src/renderer` yourself.
- Flag any place where you had to guess at unverified external behavior
  (e.g. `claude mcp get`'s exact "not found" contract, Claude Desktop's
  config path on Linux) rather than silently assuming it.
