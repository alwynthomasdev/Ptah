# Changelog

All notable changes to Ptah are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
