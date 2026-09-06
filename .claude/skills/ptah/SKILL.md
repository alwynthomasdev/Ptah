---
name: ptah
description: >-
  Work with Ptah — a local, offline, single-user ticket tracker where every ticket is a
  Markdown file on disk. Use to generate importable Ptah ticket files, read or summarise a
  ~/Ptah data folder, or move tickets between Ptah and another tracker (Jira, Linear,
  GitHub Issues, and the like).
version: 1.0.0
license: MIT
---

# Ptah skill

[Ptah](https://github.com/alwynthomasdev/Ptah) is a small, offline, local, single-user
ticket tracker — a stripped-down Jira for organising one person's work. Every ticket is a
plain Markdown file (YAML frontmatter + a Markdown body) under a data folder on disk, so
the format is portable and you can produce or read tickets without the app running.

This skill teaches you that format so you can help **outside** the app: hand-author ticket
files for Ptah's importer, read an existing data folder, and reconcile Ptah with an
external tracker.

## When to use this skill

- The user wants to **import** a batch of work into Ptah — from a Jira export, a
  spreadsheet, a list in a message, another tracker.
- The user wants you to **read or summarise** a `~/Ptah` folder, or answer questions about
  its tickets.
- The user wants to **export** Ptah tickets to another tool, or keep the two loosely in
  sync.

If Ptah's MCP server is connected (see *Using the Ptah MCP server instead*, below), prefer
it for a handful of live edits. Use generated files for bulk migration, or when the app and
its MCP server aren't available.

## Compatibility

This describes Ptah's on-disk format as of **Ptah v1.0.2**, verified against
`src/models/Ticket.ts`, `src/storage/TicketRepository.ts`, `src/storage/markdownFile.ts`,
`src/models/Project.ts`, `src/shared/ids.ts`, and `src/core/ImportExportService.ts`. If the
user's Ptah is much newer, re-check the field table below against the repo's `README.md`
("Where your data lives") and this skill's changelog at the end.

The block below is the machine-checkable summary of the format; a drift test in the Ptah
repo (`test/skills/ptah-format.test.ts`) fails if it falls out of step with the code.

```yaml
# format-summary — checked by test/skills/ptah-format.test.ts. Keep in step with the code.
skillVersion: 1.0.0
verifiedAgainstPtah: 1.0.2
frontmatterKeys: [id, title, project, type, parent, status, priority, created, due, labels, urls]
statuses: [backlog, scheduled, wip, paused, done, archive]
priorities: [lowest, low, medium, high, highest]
types: [task, epic]
projectYmlKeys: [key, name, counter, created]
idPattern: '^([A-Z][A-Z0-9]{1,9})-([1-9][0-9]*)$'
```

## On-disk layout

The data root defaults to `~/Ptah` and is user-configurable (Ptah → Settings → Data
folder). App preferences (`config.json` — the data-folder path and the theme) live in the
OS per-user config directory, **not** in the data folder.

```
<dataDir>/
├─ projects/
│  └─ <KEY>/                        folder name == project key, e.g. PTAH, TODO
│     ├─ project.yml                key, name, counter, created
│     ├─ tickets/
│     │  └─ <KEY>-<N>.md            one ticket per file; filename == ticket id
│     └─ attachments/
│        └─ <KEY>-<N>/              one folder per ticket, holds its attachment files
└─ .recyclebin/
   ├─ tickets/
   │  └─ <KEY>-<N>.md               soft-deleted ticket, now carries a deletedAt field
   └─ attachments/
      └─ <KEY>-<N>/
```

- **`project.yml`** keys, in order: `key` (uppercase, `^[A-Z][A-Z0-9]{1,9}$`, 2–10 chars),
  `name` (human-readable, non-empty), `counter` (the last ticket number handed out for this
  project), `created` (ISO-8601). Every Ptah install always has a project keyed `TODO`.
- **Ticket ids** are `<KEY>-<N>` — the project key, a dash, a positive integer with no
  leading zero (`PTAH-12`). Ids are unique across the whole data folder, not just per
  project. Pattern: `^([A-Z][A-Z0-9]{1,9})-([1-9][0-9]*)$`.
- **Attachments** are just files in `attachments/<id>/`. A relative image link in a ticket
  body resolves against that folder via Ptah's `ptah-media://media/<project>/<id>/<file>`
  scheme.

## The ticket file format

A ticket file is YAML frontmatter between `---` fences, then the Markdown body. The body is
the ticket's `description`. Ptah writes the frontmatter keys in this exact order:

| Key | Value | Notes |
|---|---|---|
| `id` | `<KEY>-<N>` | unique across the data folder. **On import Ptah reassigns it** — see *Generating importable ticket files*. |
| `title` | string | the only field that genuinely must be present and non-empty |
| `project` | project key | must match an existing `projects/<KEY>/` on the import target |
| `type` | `task` \| `epic` | default `task` |
| `parent` | ticket id, or `null` | the ticket this one sits under; may be in another project; two levels deep max |
| `status` | `backlog` \| `scheduled` \| `wip` \| `paused` \| `done` \| `archive` | default `backlog` |
| `priority` | `lowest` \| `low` \| `medium` \| `high` \| `highest` | default `medium` |
| `created` | ISO-8601 timestamp — **quote it** | e.g. `'2026-09-06T10:00:00.000Z'` |
| `due` | ISO-8601 (quote it) or `null` | an empty string also means "no due date" |
| `labels` | YAML list of strings | Ptah trims, drops blanks, dedupes case-insensitively, and **sorts** these on save |
| `urls` | YAML list of strings | reference links; order is preserved, dedupe is case-sensitive |
| `deletedAt` | ISO-8601 timestamp | **recycle bin only** — never put this on a ticket you are importing |

`attachments` is **not** in the frontmatter. Ptah derives it from the `attachments/<id>/`
folder every time it reads the ticket.

**The parser is deliberately forgiving.** A missing or blank field takes its default; an
unknown `status`, `priority`, or `type` silently falls back to the default; a `parent` that
isn't a well-formed id (or points at the ticket itself) becomes `null`; a file with no
frontmatter at all loads as a `backlog` / `medium` / `task` ticket titled with its id. So a
partially-known external ticket still imports without error — but you lose whatever didn't
map.

**YAML gotchas when hand-authoring** (Ptah parses with js-yaml's default schema):

- **Quote `created` and `due`.** An unquoted ISO datetime is parsed as a YAML timestamp and
  comes back in a non-ISO form until Ptah next saves the ticket. `due: null` unquoted is
  correct for "no due date".
- **Quote odd label / url values.** Bare `yes`, `no`, `on`, `off`, `~`, `null` become
  booleans / null; `- "yes"` stays the string.
- Keep long values on one line — Ptah writes with line wrapping disabled.

Canonical shape (this is exactly what Ptah itself writes, minus `deletedAt`):

```markdown
---
id: PTAH-13
title: Fix the login bug
project: PTAH
type: task
parent: null
status: wip
priority: high
created: '2026-09-06T10:00:00.000Z'
due: null
labels:
  - auth
  - bug
urls:
  - https://example.com/issue/42
---

## Steps to reproduce

1. ...
```

## Status and priority reference

`status` — the six stages, so you can place an external state:

| Ptah status | Means | Typical external equivalents |
|---|---|---|
| `backlog` | captured, not committed to | "Backlog", "Open", "To Do" (untriaged), "Icebox" |
| `scheduled` | committed / next up | "Selected for development", "To Do" (in a sprint), "Ready", "Planned" |
| `wip` | actively being worked | "In Progress", "In Review", "In QA", "Doing" |
| `paused` | started but on hold | "Blocked", "On Hold", "Waiting", "Impeded" |
| `done` | finished | "Done", "Closed", "Resolved", "Merged" |
| `archive` | shelved / no longer relevant | "Won't Do", "Cancelled", "Rejected", or just very old and closed |

`priority` is a five-point rank, low to high: `lowest`, `low`, `medium`, `high`, `highest`.
Map any other scheme by rank (P1→`highest` … P5→`lowest`; "Critical/Major/Minor/Trivial" by
position).

## Parents, children, and epics

- `type: epic` is only a classifier. **Any** ticket — task or epic — can be a `parent`.
- Nesting is exactly **two levels**: a ticket with a `parent` cannot itself be a parent, and
  you cannot give a `parent` to a ticket that already has children.
- `parent` may point at a ticket in a different project (ids are globally unique).
- **On import, `parent` links only survive within a single import batch.** Ptah matches a
  child's `parent` value against the source `id` of another file in the same import and
  rewrites it to the new id; a `parent` whose target isn't in the batch is dropped. So
  import an epic and its children **together**, and keep their `id` / `parent` values
  internally consistent.

## Generating importable ticket files

Produce **one `.md` file per ticket**, named `<KEY>-<N>.md` where `<KEY>` matches the
`project` in the frontmatter and `<N>` is any positive integer that is unique within the
batch.

**The `id` / `<N>` you choose is only a within-batch handle.** Ptah's importer always mints
a fresh id from the target project's counter — "imported tickets always get fresh ids …
importing never overwrites an existing ticket". The source `id` is used only to reconnect
`parent` links inside the batch. So:

- Use the source system's key as the `id` (e.g. `id: JIRA-1042`, file `JIRA-1042.md`) — it
  makes `parent` wiring obvious and is discarded on import anyway.
- Preserve the real source reference where it survives: put the source URL in `urls` and/or
  an `Imported from PROJ-1042` line at the top of the body.

Template to fill per ticket:

```markdown
---
id: JIRA-1042
title: Fix the login bug
project: PTAH
type: task
parent: null
status: wip
priority: high
created: '2026-09-03T10:00:00.000Z'
due: null
labels:
  - auth
  - bug
urls:
  - https://your-org.atlassian.net/browse/PROJ-1042
---

Imported from PROJ-1042.

## Description

...body as Markdown...
```

**With attachments**, build a `.zip` instead of loose `.md` files, laid out as:

```
tickets/<KEY>-<N>.md
attachments/<KEY>-<N>/<file>
```

Ptah copies each `attachments/<oldId>/…` file into the new ticket's attachments folder.
Reference images from the body with a relative link (`![diagram](diagram.png)`).

**How the user imports the files:** in Ptah, **Settings → Import / export → Import**, select
the `.md` / `.zip` files, and choose the target project (which must already exist). Ids are
reassigned; batch-internal `parent` links are kept, dangling ones are dropped.

**Do not** hand-drop files straight into `projects/<KEY>/tickets/`. Ptah will read them, but
it won't advance the project's `counter` in `project.yml`, so a later ticket creation can
mint the same id and overwrite your file. If you must, also raise `counter` to at least the
highest number you added.

## Reading a Ptah data folder

- **Active tickets:** `<dataDir>/projects/<KEY>/tickets/*.md`.
- **Deleted tickets:** `<dataDir>/.recyclebin/tickets/*.md` — these additionally carry a
  `deletedAt` timestamp.
- **A ticket's attachments:** the file names in `<dataDir>/projects/<KEY>/attachments/<id>/`.
- **Projects:** each `projects/<KEY>/project.yml`.

To parse a ticket: split off the leading `---\n … \n---\n` block and read it as YAML; the
rest of the file is the Markdown `description`. Apply the same forgiving fallbacks Ptah
does (unknown enum → default, bad `parent` → `null`, missing frontmatter → body-only).

When you report what you read, flag the lossy bits: `labels` may have been reordered by
Ptah, `attachments` isn't recorded in the file, and `id` is Ptah's own — not the id from
whatever system the ticket originally came from (look in `urls` or the body for that).

## Moving tickets between Ptah and Jira

Field mapping (works both directions):

| Jira | Ptah | Notes |
|---|---|---|
| Status (by category) | `status` | To Do → `backlog` (or `scheduled` if it's in an active sprint / near-term); In Progress → `wip`, but a "Blocked"/"On Hold"/"Waiting" status → `paused`; Done → `done`, but "Won't Do"/"Cancelled" → `archive` |
| Priority (Highest…Lowest, or P1…P5) | `priority` | by rank: Highest/P1 → `highest`, … Lowest/P5 → `lowest` |
| Issue type Epic | `type: epic` | |
| Issue type Story / Task / Bug / Improvement / Sub-task | `type: task` | Ptah has no "bug" type — add a `bug` label |
| Epic Link / Parent | `parent` | import the epic and its children in one batch |
| Labels + Components | `labels` | components become labels (e.g. `component:api`) |
| Summary | `title` | |
| Description (wiki markup / ADF) | body | convert to Markdown |
| Created | `created` | quote the ISO value |
| Due date | `due` | quote it, or `null` |
| Issue key + browse URL | `urls` + an `Imported from PROJ-123` body line | the key itself can't be preserved as the Ptah `id` |

Jira fields Ptah has **no home for** — assignee, reporter, sprint, story points, fix
version/release, resolution, comments, worklogs, watchers. Park them where the user can
still see them:

- a short key/value block at the top of the body (`**Assignee:** …`, `**Sprint:** …`), and
- optionally structured labels: `sprint:2026-09`, `points:5`, `fixversion:2.1`.

**Ptah → Jira** uses the same table in reverse. Export as a CSV with columns like
`Summary, Description, Issue Type, Priority, Status, Labels, Parent, External URL`, one row
per ticket; Jira's CSV importer maps your status/priority strings to its workflow on a
mapping screen during import.

## Mapping any other tracker

Rules rather than tables:

- **Statuses:** collapse the source workflow into the six Ptah statuses using the reference
  table above — unstarted → `backlog`, committed/next → `scheduled`, active (incl. review)
  → `wip`, blocked/on-hold → `paused`, closed → `done`, won't-do/stale → `archive`.
- **Priority:** map any scale onto the five-point rank by position. No priority in the
  source → leave it at `medium`.
- **Type:** `type: epic` only for genuine parent/grouping issues; everything else is
  `task`.
- **Anything with no Ptah field** (estimate, assignee, iteration, custom fields) → a
  `key:value` label or a titled block in the body. Don't silently drop it.
- **Always** keep the source id and a link in `urls`, so a later reverse sync can match
  Ptah tickets back to source items.
- Linear priority `0–4` is `0 = none` then Urgent/High/Medium/Low — map Urgent → `highest`,
  and `0` → `medium`. GitHub Issues has no priority and only open/closed — use labels for
  priority, and `done` vs `archive` by whether the issue was completed or dropped.

## Fidelity and round-trip notes

- **Ids are reassigned on import.** A Ptah export re-imported into Ptah keeps its content
  but not its ids (and thus re-derives `parent` links only within the batch).
- **`labels` are sorted and case-folded** for dedupe on every save.
- **`urls` dedupe is case-sensitive** and order is kept.
- **`attachments` never appears in frontmatter** — it's whatever is in the folder.
- **Unquoted `created` / `due`** get normalised to ISO on the ticket's first save inside
  Ptah.
- **The recycle bin is app-only** over the MCP server — you can soft-delete but not list or
  restore.

## Using the Ptah MCP server instead

When Ptah's bundled MCP server is connected (Ptah → Settings → Claude integration; see
`docs/claude-integration.md` in the repo), you can operate on the live data folder directly
instead of generating files. The tools:

| Tool | Purpose |
|---|---|
| `ptah_list_projects` | list projects — call this first to get a valid `project` key |
| `ptah_list_tickets` | list tickets (trimmed summary), optionally scoped to one project |
| `ptah_get_ticket` | full record for one ticket by id, including the description |
| `ptah_list_children` | sub-tasks of one ticket, across all projects |
| `ptah_create_ticket` | create in an existing project; `type`, `parent`, `status`, `priority`, `due`, `labels`, `urls`, `description` (body only) |
| `ptah_update_ticket` | patch fields; omit = unchanged, `due: null` clears, `parent: null` detaches |
| `ptah_delete_ticket` | soft-delete (moves to the recycle bin) |

For a migration that way: `ptah_list_projects`, then one `ptah_create_ticket` per ticket
(parents before children so you have the new ids). There is **no** attachment support and
**no** bulk/import tool over MCP — for attachments or large batches, generate a `.zip` and
use Settings → Import / export.

## Installing and updating this skill

Copy the `ptah/` folder (the one containing this `SKILL.md`) into either:

- `~/.claude/skills/ptah/` — available in every session, or
- `<your project>/.claude/skills/ptah/` — just that project.

Restart Claude Code / Claude Desktop so it's picked up. Check the `verifiedAgainstPtah`
value in the format-summary block, and the changelog below, against the Ptah version you're
working with.

## Changelog

Versioning: **patch** = wording/clarification; **minor** = an additive format change (a new
optional field, a new enum value); **major** = a breaking change (a renamed or removed
field, changed semantics).

### 1.0.0 — 2026-09-06

Initial skill. Covers Ptah v1.0.2: the ticket file format and `project.yml`, generating
importable `.md` / `.zip` files, reading a `~/Ptah` data folder, the seven MCP tools, and
mapping to/from Jira and other trackers.
