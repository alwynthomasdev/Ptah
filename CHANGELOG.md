# Changelog

All notable changes to Ptah are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **A swimlane view on the Today screen.** A segmented **List / Swimlane** toggle in the Today header switches between the existing list and a new board that groups the "due today or earlier" set by status into Backlog / Scheduled / WIP / Done lanes plus a Paused tray. Cards drag between lanes to change status, and dropping one on **Done** clears it off Today (the Done lane is only a drop target). The choice is remembered per device (`localStorage` `ptah-today-view`), mirroring the theme preference.
- **A "Next Monday" snooze preset** on the due-date menu — on both the Today list rows and the swimlane cards — alongside Tomorrow / In 3 days / In 1 week / In 2 weeks / In 1 month. Backed by new `nextWeekday()` / `nextMonday()` UTC-calendar helpers in `src/shared/dates.ts` and a shared preset list in `src/renderer/lib/snooze.ts`.
- **Inline priority editing on swimlane cards** on the Today board, via an opt-in `controls` prop on `TicketCard`; the main board's cards are unchanged.

### Changed
- The board's drag-and-drop and lane markup moved into a shared presentational `src/renderer/components/Swimlane.vue`, now used by both `SwimlaneView` and the Today board. The `.menu` / `.menu-opt` / `.menu-backdrop` dropdown styles are promoted from `TicketList.vue` to global utilities in `src/renderer/styles/base.css`.

### Fixed
- **The priority dropdown did nothing on the Today screen.** `TodayView` never wired the `@set-priority` handler from `TicketList`, so changing a ticket's priority there silently no-oped. It now persists via `tickets.update({ priority })`, the same as the List and board views.

## [1.1.0] - 2026-09-06

Adds **notes and notebooks** — a second first-class Markdown-file type living
next to tickets. A note is just a title, a Markdown body, and labels; notebooks
group notes the way projects group tickets, and every install starts with one
keyed `NOTEBOOK`. On disk they land under `notebooks/<KEY>/notes/<ID>.md` beside
a `notebook.yml`, with their own `.recyclebin/notes/` subtree. The top bar gains
a shared search box that finds tickets *and* notes at once.

### Added — Notebooks
- Notebooks are a notes-only mirror of projects: an uppercase key, a display name, and a per-notebook id counter in `notebooks/<KEY>/notebook.yml`. New `src/models/Notebook.ts` (`Notebook`, `createNotebook`, `DEFAULT_NOTEBOOK_KEY`), `src/storage/NotebookRepository.ts`, and `src/core/NotebookService.ts`; `AppContext.init()` now takes `(defaultProjectName, defaultNotebookName)` and ensures the default notebook alongside the default project.
- A **NOTEBOOKS** sidebar section (`src/renderer/App.vue`) with an "All notes" link and a `NotebookPicker.vue` create/switch control, backed by a new `notebooks` Pinia store.
- A **Default notebook** card in Settings (`src/renderer/views/SettingsView.vue`) renames the live `NOTEBOOK` notebook, and a **Notebooks** card deletes a notebook and all its notes behind a confirm — the default notebook is protected, mirroring project delete. New `config:setDefaultNotebookName` IPC and `AppConfig.defaultNotebookName` (`src/main/config.ts`, default `"Notebook"`, with field-by-field fallback).

### Added — Notes
- A note is one Markdown file — `id`, `title`, `notebook`, `created`, `updated`, `labels` frontmatter then the body — round-tripped by `noteToMarkdown` / `markdownToNote` in `src/storage/NoteRepository.ts` with the same forgiving parser as tickets. New `src/models/Note.ts` (`Note`, `NewNoteInput`, `NotePatch`, `createNote`, `applyNotePatch`) and `src/models/NoteFilter.ts` (`filterAndSortNotes`). New `FileStore` path helpers (`notebooksDir`, `notebookFile`, `notesDir`, `noteFile`, `recycledNotesDir` / `recycledNoteFile`, `recycledTicketsDir`).
- Full note CRUD across the boundary: `notebooks:*`, `notes:*`, and `noteBin:*` IPC slices in `src/shared/ipc.ts` / `src/preload/index.ts` / `src/main/ipc.ts`, with a hand-rolled `notes:create` broadcasting a `notes:changed` event to other windows (mirroring `tickets:create`). New `NoteService`, `NoteRecycleBinService`, and `NoteImportExportService` in `src/core/`, wired by `AppContext`.
- New renderer surface: `NotesListView.vue` (`/notes`), `NoteView.vue` (`/note/:id`), `NoteForm.vue` / `NoteList.vue` / `NoteDialog.vue`, and a `notes` Pinia store. The top bar's **Quick note** button and **+ New note** open a note the way **Quick ticket** / **+ New ticket** open a ticket.
- **Standalone Quick Note window** (`src/main/quickNoteWindow.ts`, `QuickNoteWindow.vue` at `#/quick-note`): an always-on-top 420×340 capture window parked bottom-left, opened by **Ctrl/Cmd+Shift+N** or the top-bar button and closed with its main window. New `window:openQuickNote` / `window:closeQuickNote` IPC.
- **Soft-delete for notes**: deleting a note moves its `.md` to `.recyclebin/notes/` with a `deletedAt` stamp. The Recycle Bin view (`src/renderer/views/RecycleBinView.vue`) gains a Notes section with restore / delete-forever, and "Empty bin" now clears both trees.
- **Note import/export**: a single note exports as a `.md` and a whole notebook as a `.zip`, and either imports back into a chosen notebook (fresh ids from the target counter). `io:exportNote` / `io:exportNotebook` / `io:importNotes` IPC, an **Export…** action on `NoteView`, and Import / export rows in Settings.

### Added — Unified search
- The top bar carries a shared search box (`GlobalSearch.vue`) that queries tickets **and** notes at once, driven by a new `search` Pinia store; **Ctrl/Cmd+K** or `/` focuses it from any view. `SearchView.vue` is rebuilt as a two-section tickets + notes results page with a shared Labels facet, ticket-only Status / Priority / Project facets, and a notes-only Notebook facet. The per-view Toolbar search is unchanged.

### Changed
- Boot (`src/renderer/App.vue`) loads notebooks and notes alongside projects and tickets and subscribes to `notes:changed`, refreshing its lists when another window adds a note.
- The Ptah skill (`.claude/skills/ptah/SKILL.md`) is bumped **1.0.1 → 1.1.0**: a new "Notebooks and notes" section, an updated on-disk layout diagram, `noteFrontmatterKeys` / `notebookYmlKeys` added to its `format-summary`, and `verifiedAgainstPtah: 1.0.5`. `README.md` documents notes throughout (features, data-layout tree, import/export table, quick-note and unified-search usage).

### Fixed
- **Modal dialog text fields felt read-only.** The global `Ctrl/Cmd+K` and `/` shortcuts stole focus out of dialog inputs — `Ctrl+K` is "kill line" in a native text field and `/` is an ordinary character — so typing in a dialog appeared to do nothing. The shortcuts are now suppressed while the user is typing into a field or while a modal dialog is open (`src/renderer/App.vue`).
- **Emptying the ticket recycle bin wiped the notes bin too.** `RecycleBinService.empty()` removed the whole `.recyclebin/` folder; it is now scoped to the tickets subtree (`recycledTicketsDir()` plus `attachments/`) so the sibling notes bin is independent (`src/core/RecycleBinService.ts`).

## [1.0.5] - 2026-09-06

Adds a one-way, create-only push from any ticket to Jira Cloud (Settings →
"Jira integration"), turning a Ptah ticket into a Jira issue and linking the two.
Also makes due dates first-class: the List view's **Due** column now reads
relative to today and is colour-coded by urgency, and the Today view can snooze a
ticket's due date forward by a preset.

### Added — Jira integration
- One-way, create-only push to Jira Cloud: a **Push to Jira…** button on the ticket detail view (`src/renderer/views/TicketView.vue`, via `JiraPushDialog.vue`) picks a Jira project and issue type, then creates a Jira Cloud issue from the ticket's title, description, and priority and appends the new issue's `…/browse/<KEY>` URL to the ticket's `urls`. No pull, no sync, no status — pushing twice just adds another link. If the target project's create screen has no priority field, the push retries once without it.
- A "Jira integration" card in Settings (`src/renderer/views/SettingsView.vue`) takes a base URL, account email, and API token, with Test connection (`GET /rest/api/2/myself`) and Disconnect actions. The token is encrypted with Electron `safeStorage` (OS keychain — DPAPI / Keychain / libsecret) and stored in `userData/jira.json`, deliberately separate from `config.json` (plaintext, and also read by the MCP server); the renderer only ever sees a `connected` boolean, never the token.
- New segregated `src/jira/**` layer: `mapping.ts` (pure Ptah→Jira field mapping — priority scale, `buildCreateFields`, browse-URL helpers; no I/O), `client.ts` (a `fetch`-based Jira REST v2 client with an `AbortController` timeout and unpacked error messages — no new dependency), `config.ts` (the encrypted `jira.json` token store), and `integration.ts` (the main-process entry, the only file `src/main/ipc.ts` imports). `mapping.ts` and `client.ts` stay `electron`-free so they unit-test without Electron; `src/jira/**` is added to `tsconfig.node.json`.
- New `window.ptah.jira.*` IPC surface — the `jira:*` channel slice defined in `src/shared/ipc.ts` and wired through `src/preload/index.ts` and `src/main/ipc.ts`: `getSettings` / `saveSettings` / `clearSettings` / `testConnection` / `listProjects` / `listIssueTypes` / `pushTicket`, fronted by a new `jira` Pinia store (`src/renderer/stores/jira.ts`).
- New `.claude/agents/jira.md` subagent (owns `src/jira` and the `jira:*` IPC slice) and `docs/jira-integration.md` guide; `README.md` and `CLAUDE.md` updated to reference both, and `CLAUDE.md` now lists explicit `mcp` and `jira` subagents alongside `core-data`.
- Tests: `test/jira/{mapping,client,config,integration}.test.ts` and `test/renderer/JiraPushDialog.test.ts`.

### Added — Due dates
- **Prominent, relative due dates in the List view.** The **Due** column now reads relative to today — a calendar icon plus "Tomorrow" / "In 3 days" / "2 days overdue" wording — turning amber when a ticket is due within three days and red once it's overdue; dates more than a fortnight away fall back to the absolute form. New `formatDueRelative` / `addToDate` helpers in `src/shared/dates.ts`, rendered by `TicketList.vue`.
- **A per-row snooze menu on the Today view.** Each row gains a menu that pushes the ticket's due date to tomorrow, +3 days, +1 week, +2 weeks, or +1 month — all measured from today, not the ticket's current due date — via `TodayView.vue` → `TicketList`'s `set-due` emit → `tickets.update({ due })`.

## [1.0.4] - 2026-09-06

Fixes a parent picker that could get stuck open, and tightens the epic /
sub-task rules so only an epic can be a parent and an epic can never have one.

### Changed
- **Only an epic can be a parent, and an epic can't be given one.** The parent picker now lists epics only (was every parentless ticket). The ticket form disables the picker when the type is Epic — or when the ticket already has sub-tasks of its own — and clears any chosen parent when you switch the type to Epic. `TicketService` now rejects a non-epic parent, rejects giving an epic a parent, and rejects demoting an epic that still has sub-tasks to a task. The MCP `parent` parameter descriptions, `README.md`, `docs/claude-integration.md`, and the Ptah skill (bumped to 1.0.1) are updated to the new rules.

### Fixed
- **The Parent picker could get stuck open.** Its full-viewport dismiss backdrop was a non-interactive descendant of a `<label>`, so the browser re-dispatched every click on it to the label's control — the picker's own toggle button — reopening the popover immediately. The ticket form no longer wraps the picker in a `<label>`.

## [1.0.3] - 2026-09-06

Adds a "Today" view, moves Quick Add into its own always-on-top window, lets you
change a ticket's priority straight from the list, checks for updates on launch,
and ships a downloadable skill documenting Ptah's on-disk ticket format.

### Added
- **Today view**: a new sidebar link (pinned above Projects) listing every open ticket — not `done` or `archived` — that is due today or earlier, across all projects, oldest first, with a count of the genuinely overdue. It deliberately ignores the sidebar project filter. The sidebar badge shows the count and turns warning-coloured when anything is overdue.
- **Standalone Quick Add window**: the top-bar **Quick add** button and the global **Ctrl/Cmd+N** shortcut now open a small, always-on-top capture window parked in the bottom-right corner instead of an in-app modal, so tickets can be captured while Ptah is in the background. It's a singleton, stays open for rapid entry, and the main window's lists refresh (via a new `tickets:changed` broadcast) as tickets are created. New `window:openQuickAdd` / `window:closeQuickAdd` IPC and a `ptah.window` / `ptah.events` surface.
- **Inline priority editing**: the Priority cell in the List, Backlog, Archive, and Search tables is now a dropdown that changes a ticket's priority in place, without opening it.
- **Launch update check**: packaged Windows and Linux builds now check for a newer GitHub release at startup and show an "Update available" dialog with release notes and an Install-now action (download, then restart to apply). macOS is still excluded (unsigned builds). This builds on the `ptah.updates.*` IPC added in 0.2.0.
- **Ptah Agent Skill** (`.claude/skills/ptah/SKILL.md`): a downloadable skill documenting Ptah's on-disk ticket format for use *outside* the app — generating importable `.md` / `.zip` files, reading a `~/Ptah` folder, and mapping tickets to and from Jira and other trackers, with no app or MCP server required. Linked from `README.md` and `docs/claude-integration.md`; a drift test (`test/skills/ptah-format.test.ts`) fails if its embedded format summary falls out of step with the code.

### Changed
- Quick-added tickets are now given a due date of **today**, so they land in the new Today view.
- **"Overdue" is now a date-only comparison**: a ticket due today is no longer treated as overdue. Previously its stored UTC-midnight timestamp counted as already in the past.
- The Settings **Claude integration** card is temporarily hidden — the MCP registration flow isn't reliable enough yet. All backend wiring (`ptah.claude.*`, `src/mcp/**`) is untouched and the card re-enables behind a single flag.
- `CLAUDE.md` and the `core-data` / `docs` / `mcp` subagent charters gained rules requiring any change to the on-disk format or the MCP tool set to update the new skill and bump its version; the `docs` agent now owns the skill.

## [1.0.2] - 2026-09-05

Adds a two-level ticket hierarchy and a fast ticket-capture path.

### Added — Epics & sub-tasks
- Tickets now have a **type** (Task or Epic) and an optional **parent** ticket, forming a two-level hierarchy: a parent cannot itself have a parent, and a ticket that already has sub-tasks cannot be given one. Parent links may cross projects.
- The ticket form gained a **Type** select and a searchable **Parent** picker (`ParentPicker.vue`) that spans every project and lists epics first; the ticket page shows a type badge, a link to the parent, and a **Sub-tasks** list.
- New `tickets.listChildren` IPC and a matching `window.ptah` method.
- MCP: `ptah_list_tickets` summaries now include `type` / `parent`, `ptah_create_ticket` and `ptah_update_ticket` accept both fields, and a new **`ptah_list_children`** tool lists a ticket's sub-tasks (7 tools total). `docs/claude-integration.md` updated.
- README: features list, ticket-file frontmatter example, and a new "Epics & sub-tasks" section.

### Changed — Epics & sub-tasks
- Ticket frontmatter gained `type:` and `parent:` keys. Files without them load as `type: task` / `parent: null` and pick up the keys on their next save — there is no migration pass.
- Moving a ticket to another project now re-points its sub-tasks at the new id. Soft-deleting a parent orphans its sub-tasks (they remain, with no parent). Restoring a sub-task whose parent is gone drops the dead link. Importing remaps parent links within the imported batch.

### Added — Quick add
- **Quick add**: a new top-bar primary button — and a global **Ctrl/Cmd+N** shortcut that works from any view — opens a minimal popup with just a title and a project picker. It stays open after each add, shows "Added `<id>`", and refocuses the title input, so a run of ideas can be captured without leaving the keyboard; the ticket list refreshes as tickets are created.
- README: a new "Creating tickets" section covering Quick add vs. the full **+ New ticket** dialog.

### Changed — Quick add
- The top bar's **+ New ticket** is now a ghost button next to the new **Quick add** primary button; it still opens the full ticket dialog (type, parent, status, priority, due, labels, links, description).
- The create dialog's project-default precedence (explicit preference → active project → default `TODO` project → first project) is now a shared `defaultProjectKey` helper in `src/renderer/lib/ticketForm.ts`, used by both Quick add and the full dialog.

## [1.0.1] - 2026-09-05

### Changed
- The app icon (`build/icon.png`) is now a flat mark of the god Ptah — a mummiform figure in a skullcap and straight beard holding the composite was/djed/ankh sceptre — replacing the old "P" lettermark; regenerate it with `node scripts/build-icon.mjs`.
- Release workflow (`.github/workflows/release.yml`): the GitHub Release body is now the matching `## [X.Y.Z]` section of `CHANGELOG.md` verbatim, with a `**Full changelog**` compare link to the previous tag appended. A new `notes` job creates the draft Release up front and the per-OS installer builds attach to it.

## [1.0.0] - 2026-09-05

First stable release. All four originally-planned milestones are complete:
foundation and Markdown-file storage, the swimlane/list/backlog/archive views
with filtering and sorting, the recycle bin with attachments and
import/export, and theming with cross-platform packaging — followed by the
0.2.0 (software updates), 0.3.0 (Claude MCP integration), and 0.4.0 (search
page, project moves) incremental releases.

## [0.4.0] - 2026-09-05

### Added
- A "Default project" field in Settings sets the display name of the always-present default project (its key stays `TODO`).
- Move a ticket to a different project from its edit page: changing the Project field and saving (behind a confirm) mints it a new id in the target project and carries its attachments along.
- A dedicated Search page (sidebar "Search" link, `/search`): its own text box plus Status/Priority/Labels/Project filters search every ticket in every project, independent of any other view's filters.

### Changed
- The New Ticket dialog and the ticket edit page now share one always-visible Project dropdown, defaulting to the active project (else the default project, else the first project) but changeable before saving.
- The default project is now pinned first in every project list/dropdown (sidebar, Settings, ticket forms); on-disk order is unaffected.
- The default project can no longer be deleted; its Delete button in Settings is disabled with an explanatory tooltip.
- "+ New ticket" moved from the per-view toolbar (Board/List/Backlog/Archive only) to the always-visible top bar, so it's available from every route.
- Free-text ticket search moved from the top bar into the per-view toolbar, where it now only shows on List/Backlog/Archive; the toolbar's Project filter chip is hidden while a specific project is active in the sidebar.

### Removed
- The sidebar quick-add input (`QuickAddTask`) — the New Ticket dialog is now the only ticket-creation path.

## [0.3.0] - 2026-09-04

### Added
- A default `TODO` project is always present — created automatically on first launch and on every data-dir switch (idempotent; never overwrites an existing TODO project's name, counter, or tickets).
- Sidebar quick-add: a single input pinned above the Projects list creates a ticket in the TODO project on Enter, no dialog needed.

### Added — Claude integration
- Ptah can register itself as a local [MCP](https://modelcontextprotocol.io) server for Claude Code and/or Claude Desktop, giving Claude six tools to list, read, create, update, and (soft-)delete tickets and to list projects — all against the same data directory Ptah itself is pointed at.
- A "Claude integration" card in Settings shows each target's status (Not installed / Not connected / Connected) and connects or disconnects it with one click; Connect registers the server via `claude mcp add` for Claude Code, or by writing into `claude_desktop_config.json` for Claude Desktop.
- `window.ptah.claude.{detect,connect,disconnect}` IPC surface, backed by `src/mcp/integration.ts`; the MCP server itself is bundled separately via `npm run build:mcp` (esbuild) into `dist-electron/mcp/index.js` and run under `ELECTRON_RUN_AS_NODE`, so no separate Node.js install is required.
- `docs/claude-integration.md`: setup, what the tools do, manual configuration for non-standard installs, and known limitations.

## [0.2.0] - 2026-09-04

### Added — Software updates
- In-app update checking for packaged Windows and Linux builds: a "Software update" section in Settings checks the project's GitHub Releases, downloads an available update, and restarts to install it. macOS is excluded — Ptah's builds are unsigned, and macOS's update mechanism requires a signed and notarized app.
- `window.ptah.updates.{check,download,install}` IPC surface, backed by a new `src/main/updater.ts` wrapper around `electron-updater`.

### Changed — Software updates
- `electron-builder.yml` gained a `publish` (GitHub) block so update metadata (`latest.yml` / `latest-linux.yml`) is generated on build; `dist` / `dist:dir` pass `--publish never` since uploading to GitHub Releases stays the job of the existing tag-triggered release workflow.

### Added — Quick tweaks
- Tickets now carry an ordered `urls` list (reference links), editable in the ticket form and shown as clickable links on the ticket page.
- Status filter chip in the toolbar, alongside Priority/Labels/Project.
- A search box in the Labels filter chip (`FilterChip` gained an opt-in `searchable` mode).
- Ticket counts on the List (working set) and Backlog tabs.
- A "Projects" section in Settings listing every project with a Delete action.
- Creating a ticket while viewing "All projects" now prompts for a project instead of being disabled.

### Changed — Quick tweaks
- The ticket dialog is now create-only; viewing/editing a ticket opens a routed `/ticket/:id` page instead of a modal, defaulting to a read-only preview with Edit/Delete/Export actions.
- The sidebar dropped the "Views" and "Filter by label" sections — it's now just Projects plus standalone Settings and Recycle bin links; clicking a project (or "All projects") now navigates straight to the Swimlane board.
- Project deletion moved from a hover "✕" icon on each sidebar row to the new Projects section in Settings.
- Swimlane lanes now flex to fill available width (with a minimum floor) instead of a fixed 280px, still horizontal-scrolling when squeezed.

### Added — Milestone 4: Theming, packaging, docs
- App icon (`build/icon.png`) wired into the packaged build: Windows/macOS/Linux installer icons via `electron-builder.yml`, and the `BrowserWindow` icon at runtime (dev vs packaged path).
- Pre-paint theme boot script (`public/theme-boot.js`) reads a `localStorage` mirror of the theme choice and stamps `data-theme` before Vue mounts, eliminating the light/dark flash on launch.
- CI workflow (`.github/workflows/ci.yml`): lint, typecheck, test, and build on push/PR.
- Release workflow (`.github/workflows/release.yml`): on a `v*` tag, builds installers on Windows/macOS/Linux and attaches them to a draft GitHub Release.
- `LICENSE` (MIT).
- `engines.node` (`>=20`) in `package.json`.
- README rewrite: accurate Milestone 1–4 status, a Usage guide, an Import/export guide, corrected data-layout and frontmatter documentation, and installer/CI docs.

### Changed — Milestone 4
- Changing the data folder now shows a native confirm dialog and reloads all windows after repointing storage, instead of silently swapping context underneath the running renderer.
- Toggling the theme now also updates `nativeTheme.themeSource`, so native window chrome (title bar, dialogs) stays in sync with the app theme.
- New CSS custom property scales for radius, spacing, type, z-index, and interaction states; base primitives (button/input/card/tag) and several components (`FilterChip`, `ThemeToggle`, `TicketDialog`, `TicketList`, `Toolbar`, `SwimlaneView`) now consume them instead of hardcoded literals.
- The packaged window's `backgroundColor` now matches `tokens.css`'s `--bg` for both themes (was off-palette), and dev-vs-packaged window setup is gated on `app.isPackaged` instead of just the presence of a dev server URL.

### Fixed
- The `prefers-color-scheme` change listener for the `system` theme was being re-registered on every `settings.load()`, leaking listeners; it's now bound once at module scope.

### Added — Milestone 3: Attachments & import/export
- Ticket attachments: add or remove files on a ticket from the edit dialog (`AttachmentList`), with open-in-OS and reveal-in-folder actions; files are copied into the ticket's `attachments/<id>/` folder and colliding names get a numeric suffix.
- "Insert image/file" action in the Markdown editor: attaches a file to the ticket and drops a relative Markdown image/link reference at the caret.
- Import / export: export a single ticket as a `.md` file (no attachments) or a `.zip`, export a whole project as a `.zip` with an optional "include attachments" toggle, and import `.md` / `.zip` files into a project. Import always allocates fresh ticket ids. Adds `ImportExportService`, `attachments:*` / `io:*` IPC, and an Import / export panel in Settings.
- Export action on each ticket row and in the ticket dialog.
- Permanently delete a project and all its tickets from the sidebar, behind a confirm; project deletion never uses the recycle bin.

### Fixed
- Markdown body normalization on read now mirrors the writer, so reloading or re-importing a ticket no longer shifts leading blank lines in its description.

### Added — Milestone 2: Views, filtering, Markdown
- Interactive Swimlane: drag tickets between the Scheduled / WIP / Done lanes or the Paused tray to change status; the new status is written to disk.
- Filter bar with Priority, Labels, and Project multi-select chips plus a Clear control, all bound to `TicketFilter` fields.
- Multi-project scope: the renderer now loads every project's tickets, with an "All projects" row in the sidebar and project chips scoping the active view; status and label counts respect the current scope.
- Markdown rendering (markdown-it with heading anchors and syntax highlighting) and a Write / Preview editor in the ticket dialog.
- `ptah-media://` protocol so rendered Markdown can load a ticket's local images, with a path-traversal guard on resolution.
- `system:openExternal` IPC to open `http(s)` / `mailto` links in the OS default handler.

### Changed — renderer restyle
- Reworked the renderer to match the `design/ptah-mockup.html` prototype: 52px top bar, sectioned sidebar, in-view tabs + toolbar, horizontal swimlane, flat (no-shadow) surfaces, and monospace type for identifiers.
- Rebuilt `styles/tokens.css` around the mockup's palette — core surfaces, status colours, priority scale, and the sans / mono font stacks.
- New shell components: `TopBar`, `ViewTabs`, `Toolbar`, `ThemeToggle`.

### Added — Milestone 1: Foundation
- Electron + Vue 3 + TypeScript project scaffold (Vite, `vite-plugin-electron`, Vitest, ESLint, Prettier).
- Layered architecture: `models`, `shared`, `storage`, `core`, `main`/`preload`, `renderer`.
- Markdown-file storage: one `<ID>.md` per ticket with YAML frontmatter + Markdown body; per-project `project.yml` with an id counter.
- Ticket ids of the form `<PROJECTKEY>-<N>`.
- Core services: project CRUD, ticket CRUD, and a recycle bin (soft-delete / restore / purge).
- Typed IPC bridge on `window.ptah`; renderer never touches the filesystem.
- UI: sidebar with project picker, Swimlane (read-only), List, Backlog, Archive, Recycle Bin, and Settings views; create/edit ticket dialog.
- Light / Dark / System theming via CSS custom properties.
- Unit tests for id helpers, ticket model, filter/sort, frontmatter round-trip, repositories, and services.
