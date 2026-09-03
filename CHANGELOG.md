# Changelog

All notable changes to Ptah are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
