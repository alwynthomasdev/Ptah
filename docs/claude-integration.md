# Claude integration

Ptah can register itself as a local [MCP](https://modelcontextprotocol.io) server, so
Claude Code or Claude Desktop — running on the same machine as Ptah — can read, create,
edit, and delete your tickets directly, as part of a normal conversation.

## What it does

Once connected, Claude has access to six tools:

| Tool | What it does |
|---|---|
| `ptah_list_tickets` | List tickets, optionally scoped to one project. Returns a trimmed summary of each (id, title, project, status, priority, due date, labels) — not the full description, so a large list doesn't blow up Claude's context. |
| `ptah_get_ticket` | Get the full record for one ticket by id (e.g. `PTAH-12`), including its Markdown description. |
| `ptah_create_ticket` | Create a new ticket in an existing project. |
| `ptah_update_ticket` | Patch fields on an existing ticket. Omitted fields are left unchanged; passing `due: null` clears the due date. |
| `ptah_delete_ticket` | Soft-delete a ticket (moves it to the recycle bin, same as deleting from the app). |
| `ptah_list_projects` | List every project, so Claude can pick a valid project key before creating a ticket. |

These tools operate on the same data directory Ptah itself is currently configured to use
(see Settings → Data folder) — Claude is reading and writing the same Markdown files you'd
see in Ptah.

## Prerequisites

- Ptah, installed and run at least once (it needs to have written its config file).
- [Claude Code](https://claude.com/claude-code) and/or the [Claude Desktop](https://claude.ai/download)
  app, installed on the same machine as Ptah.

## Setup

1. Open Ptah's **Settings**.
2. Find the **Claude integration** card.
3. Click **Connect** next to whichever you use — Claude Code, Claude Desktop, or both.

That's it. No manual configuration is needed in the normal case. The card shows each
target's status — **Not installed**, **Not connected**, or **Connected** — and re-checks it
after every Connect/Disconnect. **Disconnect** removes the registration the same way.

## If Connect doesn't work

Connect works by detecting your Claude install and registering Ptah as an MCP server for
it. If autodetection misses your install (for example, a Claude Code binary that isn't on
your `PATH`, or a Claude Desktop install in a nonstandard location), here's what Connect
does under the hood, so you can replicate it by hand.

The exact paths below are resolved by Ptah itself at connect time and differ per machine
and OS — this section is meant as troubleshooting context, not a block to copy and paste
verbatim.

### Claude Code

Connect shells out to the `claude` CLI, roughly equivalent to:

```
claude mcp add ptah -s user -e ELECTRON_RUN_AS_NODE=1 -- <path to Ptah's executable> <path to Ptah's install>\resources\...\mcp\index.js --config <path to Ptah's config.json>
```

- `-s user` registers it for your user account (not just the current project).
- `-e ELECTRON_RUN_AS_NODE=1` tells Ptah's own executable to run the script as plain
  Node.js instead of launching the Ptah GUI — this is how Ptah avoids requiring a separate
  Node.js install just to run its MCP server.
- The script path points at Ptah's bundled MCP server, inside Ptah's own install
  directory.
- `--config` points at Ptah's `config.json` (in Electron's per-user config directory —
  see the main [README](../README.md#where-your-data-lives)), so the server always reads
  whatever data directory Ptah is currently pointed at.

If you have the `claude` CLI on your `PATH` and know where Ptah is installed, you can run
`claude mcp add` yourself with the same shape, or simply ask Claude Code to "add Ptah as an
MCP server" and point it at Ptah's install directory — Claude Code can usually work out the
rest from there.

### Claude Desktop

Connect reads, merges into, and writes back Claude Desktop's own config file:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

It adds (or replaces) an entry under `mcpServers.ptah`, alongside whatever else is already
in the file:

```json
{
  "mcpServers": {
    "ptah": {
      "command": "<path to Ptah's executable>",
      "args": ["<path to Ptah's mcp/index.js>", "--config", "<path to Ptah's config.json>"],
      "env": { "ELECTRON_RUN_AS_NODE": "1" }
    }
  }
}
```

Every other top-level key and every other entry under `mcpServers` is left untouched. If
Connect can't find your Claude Desktop install, you can add this block by hand — restart
Claude Desktop afterwards for it to pick up the change.

## Limitations

- **Ticket CRUD only.** Claude can list, read, create, update, and delete tickets. It
  cannot create, rename, or delete projects, and it cannot see or restore anything in the
  recycle bin — those stay app-only for now.
- **No live refresh.** If Ptah's window is open while Claude makes a change, the window
  won't update automatically. Switch views (or reload) to see the change reflected.
- **No built-in cross-tool sync.** If you also have another MCP server connected — say,
  one for Jira — reconciling data between it and Ptah is Claude's own job as it reasons
  across the tools it has access to. Ptah doesn't build or manage any such syncing itself.

## Troubleshooting

- **"Claude Code" shows "Not installed" even though it is** — Ptah detects Claude Code by
  running `claude --version`. If the `claude` CLI isn't on your system `PATH`, Ptah can't
  find it even if the app itself is installed. Make sure `claude` is reachable from a
  regular terminal, then retry.
- **"Claude Desktop" shows "Not installed"** — this usually means the app has never been
  run yet (its config folder doesn't exist until first launch). On Linux, Ptah's guess at
  the config location (`~/.config/Claude/`) is best-effort and unverified — if your install
  puts it somewhere else, detection may simply not find it; you can still connect manually
  using the config shape above.
