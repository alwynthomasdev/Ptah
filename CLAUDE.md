# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ptah is a cross-platform Electron desktop app (Vue 3 renderer) for personal
ticket tracking. Every ticket is a Markdown file on disk (`~/Ptah` by default),
so the storage format is a first-class, portable artifact — not an implementation
detail. See `README.md` for the on-disk layout and `spec.md` for the full
product spec.

The build is delivered in milestones; the plan and current milestone status live
in `~/.claude/plans/read-spec-md-plan-the-eager-babbage.md` and `CHANGELOG.md`.

## Subagents

Work is divided across `.claude/agents/`: **`ui`** (`src/renderer`),
**`core-data`** (`src/models` / `src/shared` / `src/storage` / `src/core` /
`src/main` / `src/preload`), **`tester`** (`test/`), **`docs`** (README + guides),
and **`git-manager`** (all git + `CHANGELOG.md` + releases). Each works freely
within its lane and passes `typecheck`/`lint`/`test`; none commits — that routes
through `git-manager`.

## Git, CHANGELOG, and releases

All git work goes through the **`git-manager`** subagent
(`.claude/agents/git-manager.md`). Do not `git add` / `git commit` / edit
`CHANGELOG.md` from the main loop. The agent maintains `CHANGELOG.md`'s
`[Unreleased]` section as part of preparing each user-visible commit, and it
never commits, tags, or packages a release without the user's explicit approval.
Releases (`version` bump → dated CHANGELOG section → `Release vX.Y.Z` commit →
`vX.Y.Z` tag → `npm run dist`) happen only when the user explicitly calls for
one. No branching for now — single linear history.

## Commands

```bash
npm run dev          # Vite dev server; vite-plugin-electron auto-launches Electron with hot reload
npm test             # Vitest, single run
npm run test:watch   # Vitest watch mode
npx vitest run test/core/services.test.ts          # one test file
npx vitest run -t "allocates sequential ids"       # one test by name
npm run typecheck    # vue-tsc (app) + tsc (node) — both projects, no emit
npm run lint         # eslint over .ts/.vue
npm run format       # prettier --write
npm run build        # typecheck + build renderer, main, and preload bundles
npm run dist         # build + electron-builder installer into release/<version>/
```

In VS Code, F5 runs the "Ptah: dev (Electron + Vite)" config, which is just
`npm run dev` with `autoAttachChildProcesses` so breakpoints work in the main
process. The renderer is debugged in Electron's own DevTools (opened
automatically in dev).

## Architecture

### Process split — the load-bearing constraint

The renderer **never** touches the filesystem or Node APIs. All persistence runs
in the Electron main process. The only channel between them is a typed
`window.ptah` object exposed by `src/preload/index.ts` via `contextBridge`.

Data flows: **renderer store → `window.ptah.*` → IPC → `src/main/ipc.ts` handler
→ core service → repository → `FileStore` → disk**, and back.

- `src/shared/ipc.ts` is the single source of truth for the boundary: the `IPC`
  channel-name constants and the `PtahApi` interface. `src/preload/index.ts` and
  `src/main/ipc.ts` both implement against it — change all three together.
- Every IPC call resolves to a `Result<T>` (`src/shared/result.ts`), never a
  raw throw. Main-side handlers wrap work in `tryResult`; the renderer's
  `call()` helper (`src/renderer/api.ts`) unwraps it back into a throw.

### Layers

| Dir | Runs in | Rule |
| --- | --- | --- |
| `src/models` | both | Pure types + factories/validators. **No Node imports** — the renderer bundles these. |
| `src/shared` | both | Id/date/Result helpers, the IPC contract. **No Node imports** (except types). |
| `src/storage` | main | `FileStore` (every `fs` primitive + path layout), `TicketRepository`/`ProjectRepository` (domain object ↔ file), `markdownFile.ts` (frontmatter parse/stringify). |
| `src/core` | main | Services orchestrating repositories. `AppContext` wires one set of services for a given `dataDir`. |
| `src/main`, `src/preload` | main | Window/lifecycle, IPC registration, the bridge. |
| `src/renderer` | renderer | Vue 3 + Pinia + vue-router (hash history). Stores call `window.ptah`; components never do. |

Path aliases: `@models`/`@shared` resolve everywhere; `@main`/`@core`/`@storage`
resolve only in the main-side build and in tests. Keeping `models`/`shared`
Node-free is what lets the renderer import them.

### Key mechanics

- **Ticket ids** are `<PROJECTKEY>-<N>` (e.g. `PTAH-12`). The number comes from a
  per-project counter in `project.yml`; `ProjectRepository.bumpCounter` reserves
  the next one. Helpers in `src/shared/ids.ts`.
- **A ticket file** = YAML frontmatter (metadata) + Markdown body (description).
  `attachments` is derived from the ticket's attachments folder on read and is
  never written to frontmatter. Round-trip logic: `ticketToMarkdown` /
  `markdownToTicket` in `src/storage/TicketRepository.ts` (both exported for
  tests). Corrupt enum values fall back to safe defaults rather than throwing.
- **Recycle bin**: deleting a *ticket* is soft — `RecycleBinService` moves its
  `.md` + attachments under `.recyclebin/` with a `deletedAt` stamp. Deleting a
  *project* is permanent (`ProjectService.delete` removes the whole folder).
- **Changing the data directory** rebuilds `AppContext` in `src/main/ipc.ts`
  (the `context` binding is reassigned); handlers are registered once and close
  over the mutable binding.
- **Filtering/sorting** is pure and lives in `src/models/Filter.ts`
  (`filterAndSort`), applied in the renderer stores and `TicketBrowser.vue`.

### Build specifics

- Main and preload are bundled to **CommonJS** (there is intentionally no
  `"type": "module"` in `package.json`). Importing the `electron` builtin from
  an ESM main bundle crashes under Electron's Node — keep the main/preload
  output CJS.
- `vite.config.ts` uses `vite-plugin-electron/simple`; the `main` and `preload`
  sub-configs each need their own `resolve.alias` block (the renderer's aliases
  don't apply to them).
- Two tsconfigs, referenced by `tsconfig.json`: `tsconfig.app.json` (renderer +
  shared/models + preload, DOM libs) and `tsconfig.node.json` (main-side + tests,
  node types). `npm run typecheck` runs both.

## Tests

Vitest, `node` environment by default (`test/renderer/**` opts into jsdom).
Repository/service tests run against a real temp dir via
`test/helpers/tmp.ts::makeTmpDir` — prefer that over mocking `fs`. Serialization
tests import `ticketToMarkdown`/`markdownToTicket` directly.
