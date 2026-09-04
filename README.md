# Ptah

A local-first personal ticket / todo system — a stripped-down Jira/YouTrack for a
single user. Every ticket is a plain Markdown file on your disk, so your data
stays portable and readable with or without this app.

Named after the ancient Egyptian creator god.

> **Status:** M1–M4 complete. Projects and tickets, Swimlane with
> drag-to-restatus, List / Backlog / Archive views, filtering and sorting, a
> Markdown editor, attachments, Markdown/zip import & export, a recycle bin,
> Light / Dark / System theming, and installers for Windows / macOS / Linux are
> all in. See [CHANGELOG.md](./CHANGELOG.md).

## Features

- Multiple **projects**; every ticket belongs to one.
- **Tickets** with id, title, project, status, priority, created/due dates,
  labels, a Markdown description, and attachments.
- **Statuses:** Backlog, Scheduled, WIP, Paused, Done, Archive.
- **Views:** Swimlane (Scheduled → WIP → Done with a Paused tray; drag a card
  between lanes to change its status), List, separate Backlog and Archive lists,
  Recycle Bin.
- **Filtering & sorting** by title, labels, project and priority; sort by
  priority, created or due date.
- **Recycle bin** for tickets (restore / purge / empty). Deleting a *project* is
  permanent.
- **Import / export** — a single ticket as Markdown, or a `.zip` when it has
  attachments; a whole project as a `.zip` with or without attachments.
- **Themes:** Light / Dark / System, persisted and applied before first paint.
- **Claude integration** — connect Claude Code or Claude Desktop from Settings so Claude
  can read, create, edit, and delete your tickets directly. See
  [docs/claude-integration.md](./docs/claude-integration.md).

## Usage

### Views

- **Swimlane** — the Scheduled, WIP and Done lanes plus a collapsible **Paused**
  tray. Drag a ticket card onto another lane (or the tray) to change its status;
  the new status is written to the ticket's file immediately.
- **List / Backlog / Archive** — tables of every ticket, of `backlog` tickets,
  and of `archive` tickets respectively.
- **Recycle Bin** — soft-deleted tickets, with per-row **Restore** and **Purge**
  and an **Empty** action.
- Pick the active project (or **All projects**) in the sidebar; the search box in
  the top bar filters by title across the current scope.

### Filtering & sorting

The toolbar has multi-select chips for **Priority**, **Labels** and **Project**
plus a **Clear** control, and a sort control (priority / created / due, ascending
or descending). The sidebar also has a quick label filter. All of it feeds one
pure `filterAndSort` pass, so every view stays consistent.

### Markdown & attachments

- The ticket dialog's description field has a **Write / Preview** toggle
  (markdown-it, with heading anchors and syntax highlighting).
- **Insert image / file** attaches a file to the ticket and drops a relative
  reference at the caret. Rendered Markdown loads a ticket's local images through
  the `ptah-media://` scheme (see below).
- **Attachments** can be added (native multi-select picker), removed, **opened**
  in the OS default app, or **revealed** in the OS file manager. Files are copied
  into the ticket's `attachments/<id>/` folder; a colliding name gets a numeric
  suffix.

### Recycle bin vs. deleting a project

Deleting a **ticket** is a soft delete — its `.md` and attachments move under
`.recyclebin/` with a `deletedAt` stamp and can be restored or purged. Deleting a
**project** from the sidebar is **permanent**: the whole project folder and every
ticket in it are removed, behind a confirmation.

### Settings

- **Theme** — Light / Dark / System. The choice is saved to the app config and
  mirrored to `localStorage` so a cold start paints the right theme with no
  flash. On *System*, Ptah follows the OS and updates live when it changes.
- **Data folder** — change where Ptah reads tickets from. You're asked to
  confirm, then the window reloads against the new folder. Your existing data is
  **not** moved or copied — it stays in the old folder.
- **Import / export** panel — see below.
- **Claude integration** — connect Claude Code and/or Claude Desktop with one click; see
  [docs/claude-integration.md](./docs/claude-integration.md) for what it does, how to set
  it up, and its limitations.

## Import / export

| Source / target | Format |
|---|---|
| One ticket, no attachments | `.md` (YAML frontmatter + body) |
| One ticket with attachments | `.zip` (the `.md` + its attachments folder) |
| A whole project | `.zip`, with an **Include attachments** toggle |

Import accepts one or more `.md` / `.zip` files and drops them into a project you
choose. **Imported tickets always get fresh ids** from the target project's
counter — importing never overwrites an existing ticket.

## Where your data lives

By default in `~/Ptah` (change it in **Settings**). Layout:

```
~/Ptah/
├─ projects/
│  └─ PTAH/
│     ├─ project.yml                 # key, name, counter, created
│     ├─ tickets/
│     │  └─ PTAH-1.md                # YAML frontmatter + Markdown body
│     └─ attachments/
│        └─ PTAH-1/…                 # files attached to that ticket
└─ .recyclebin/
   ├─ tickets/
   │  └─ PTAH-7.md                   # soft-deleted ticket (has a deletedAt field)
   └─ attachments/
      └─ PTAH-7/…                    # its attachments
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
due: 2026-09-10T00:00:00.000Z   # written as `due: null` when there is no due date
labels:
  - bug
  - auth
---

## Steps to reproduce

1. …
```

Recycled tickets additionally carry a `deletedAt: <iso>` field. `attachments` is
**not** stored in frontmatter — it's derived from the ticket's `attachments/<id>/`
folder when the ticket is read.

**Local images.** A relative image link in a ticket's Markdown resolves to that
ticket's attachments folder via the privileged `ptah-media://` scheme:

```
ptah-media://media/<project>/<ticketId>/<file>
   ->  <dataDir>/projects/<project>/attachments/<ticketId>/<file>
```

Resolution is guarded against path escape (`..`, absolute paths, NUL).

**App config.** The data-folder path and the theme live in
`config.json` in Electron's per-user config directory (`%APPDATA%\Ptah` on
Windows, `~/Library/Application Support/Ptah` on macOS, `~/.config/Ptah` on
Linux) — everything else lives in the data folder itself.

## Development

Requires Node.js 20+ (enforced by `engines` in `package.json`).

```bash
npm install
npm run dev        # launch the app with hot reload
npm test           # run the unit test suite (Vitest)
npm run typecheck  # vue-tsc + tsc, no emit
npm run lint
npm run format     # prettier --write
```

### Building an installer

```bash
npm run build      # typecheck + build renderer, main and preload bundles
npm run dist       # build + electron-builder -> release/<version>/
                   #   Windows: nsis .exe · macOS: .dmg · Linux: .AppImage
npm run dist:dir   # unpacked build, for quick local checks
```

Config for packaging is in [`electron-builder.yml`](./electron-builder.yml). The
app icon is `build/icon.png` (a placeholder mark); the Windows/macOS icons are
derived from it by electron-builder. To regenerate `build/icon.png` from source
art, replace it with any square PNG ≥ 512×512. Builds are **unsigned**, so
Windows SmartScreen / macOS Gatekeeper will warn on first run.

Pushing a `vX.Y.Z` tag triggers `.github/workflows/release.yml`, which runs
`npm run dist` on all three OSes and attaches the installers to a draft GitHub
Release. `.github/workflows/ci.yml` runs lint / typecheck / test / build on every
push and PR.

Packaged Windows and Linux builds can update themselves: Settings has a
"Check for updates" control that checks the project's GitHub Releases and, if
a newer version is available, can download and install it in place (restarts
the app to apply). macOS is excluded — Ptah's builds are unsigned, and
macOS's update mechanism requires a signed and notarized app, so Mac users
keep downloading the `.dmg` manually.

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
behind IPC, and every IPC call resolves to a `Result<T>` rather than throwing
across the boundary.

## License

[MIT](./LICENSE).
