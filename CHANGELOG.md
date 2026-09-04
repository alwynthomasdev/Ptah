# Changelog

All notable changes to Ptah are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
