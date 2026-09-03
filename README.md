# Ptah

A local-first personal ticket / todo system — a stripped-down Jira/YouTrack for a
single user. Every ticket is a plain Markdown file on your disk, so your data
stays portable and readable with or without this app.

Named after the ancient Egyptian creator god.

> **Status:** in development. Milestone 1 (foundation) is in place: projects,
> tickets, list views, a read-only swimlane, recycle bin, and theming. Filtering,
> drag-and-drop, attachments, and import/export land in later milestones — see
> [CHANGELOG.md](./CHANGELOG.md).

## Features

- Multiple **projects**; every ticket belongs to one.
- **Tickets** with id, title, project, status, priority, created/due dates,
  labels, a Markdown description, and attachments.
- **Statuses:** Backlog, Scheduled, WIP, Paused, Done, Archive.
- **Views:** Swimlane (Scheduled → WIP → Done, with a Paused tray), List,
  separate Backlog and Archive lists, Recycle Bin.
- **Filtering & sorting** by title, labels, project, priority / created / due.
- **Recycle bin** for tickets. Deleting a *project* is permanent.
- **Import / export** to Markdown (and zip when a ticket has media).
- **Themes:** Light / Dark / System.

## Where your data lives

By default in `~/Ptah` (change it in **Settings**). Layout:

```
~/Ptah/
├─ projects/
│  └─ PTAH/
│     ├─ project.yml            # key, name, id counter, created
│     ├─ tickets/
│     │  └─ PTAH-1.md           # YAML frontmatter + Markdown body
│     └─ attachments/
│        └─ PTAH-1/…            # files attached to that ticket
└─ .recyclebin/                 # soft-deleted tickets
```

A ticket file:

```markdown
---
id: PTAH-1
title: Fix the login bug
project: PTAH
status: wip
priority: high
created: 2026-09-03T10:00:00.000Z
due: 2026-09-10T00:00:00.000Z
labels:
  - bug
  - auth
---

## Steps to reproduce

1. …
```

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev        # launch the app with hot reload
npm test           # run the unit test suite (Vitest)
npm run typecheck  # vue-tsc + tsc, no emit
npm run lint
```

### Building an installer

```bash
npm run dist       # -> release/<version>/ (nsis on Windows, dmg on macOS, AppImage on Linux)
npm run dist:dir   # unpacked build, for quick local checks
```

## Architecture

| Layer | Path | Responsibility |
|---|---|---|
| Models | `src/models` | Pure types + factories/validators shared across layers |
| Helpers | `src/shared` | Id/date/Result helpers, the IPC contract |
| Storage | `src/storage` | Filesystem access; Ticket/Project ↔ files |
| Core | `src/core` | Services orchestrating the repositories |
| Main | `src/main`, `src/preload` | Electron process, IPC handlers, typed `window.ptah` bridge |
| Renderer | `src/renderer` | Vue 3 UI (Pinia stores, router, views, components) |

The renderer never touches `fs`; all filesystem work happens in the main process
behind IPC.

## License

MIT
