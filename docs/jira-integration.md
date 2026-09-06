# Jira integration

Ptah can push a ticket to [Jira Cloud](https://www.atlassian.com/software/jira) as a
new issue — its title, description, and priority — and link the new issue back on the
Ptah ticket. It is **one-way**: Ptah never reads from Jira or keeps the two in sync.

## What it does

The **Push to Jira…** button on a ticket's detail page opens a small dialog where you
pick a target Jira project and issue type, then creates one issue:

| Ptah | Jira field | Notes |
|---|---|---|
| Title | `summary` | Sent verbatim. |
| Description | `description` | Sent as plain text via the v2 REST API — Markdown is **not** converted to Atlassian Document Format, so headings, tables, and links stay as literal Markdown. |
| Priority | `priority` | Mapped by name (see below). Dropped automatically if the target project's create screen has no priority field. |
| Project + issue type | `project`, `issuetype` | Chosen in the dialog on every push; nothing is remembered. |

Priority maps one-to-one with a stock Jira Cloud site:

| Ptah | Jira |
|---|---|
| Highest | `Highest` |
| High | `High` |
| Medium | `Medium` |
| Low | `Low` |
| Lowest | `Lowest` |

After the issue is created, its browse URL (`https://your-site/browse/KEY-123`) is
appended to the ticket's **URLs** list and saved to the Markdown file.

## Prerequisites

- A Jira **Cloud** site (`https://your-org.atlassian.net`). Jira Server / Data Center
  is not supported.
- An Atlassian **API token**, created at
  [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
- Your Atlassian **account email** (the one you log in with).

## Setup

1. Open Ptah's **Settings** and find the **Jira integration** card.
2. Enter your **Base URL** (`https://your-org.atlassian.net`), **Account email**, and
   **API token**, then click **Save**.
3. Click **Test connection** — it should report *Connected as &lt;your name&gt;*.

The token is encrypted with your operating system's secure store (DPAPI on Windows,
Keychain on macOS, libsecret on Linux) and written to `jira.json` next to Ptah's
`config.json` — never to a ticket file and never into `config.json` itself. **Save**
with the token field left blank keeps the stored token; **Disconnect** erases all
three values.

## Using it

1. Open a ticket and click **Push to Jira…**.
2. Optionally type in the filter box to narrow the project list, then pick a **Jira
   project**.
3. Pick an **issue type** (a *Task*-named type is pre-selected when present).
4. Click **Push to Jira**. On success the dialog closes and the ticket shows
   *Created KEY-123 in Jira*, with the issue link now in its URLs.

## Limitations

- **One-way, create-only.** Every push makes a **new** issue — there is no update or
  re-sync. Pushing the same ticket twice creates two issues and adds two links.
- **No status.** The new issue lands in whatever its workflow's initial status is;
  Ptah does not set or transition it.
- **No field mapping beyond the three above.** Labels, due date, parent/epic,
  attachments, assignee, and sprint are not sent.
- **Description fidelity.** Markdown is sent as plain text, not ADF.
- **Priority may be silently dropped** if the target project's create screen doesn't
  expose the priority field — the issue is still created.
- **Cloud only.** No Jira Server / Data Center, no OAuth — just email + API token.

For a richer, spreadsheet-style migration between Ptah and Jira (whole backlogs, more
fields, both directions), use the downloadable Agent Skill instead:
[`.claude/skills/ptah/SKILL.md`](../.claude/skills/ptah/SKILL.md).

## Troubleshooting

- **"Jira rejected the credentials (401)"** — the account email or API token is wrong,
  or the token was revoked. Re-create the token and **Save** it again.
- **"Jira denied the request (403)"** — the account is authenticated but lacks
  *Create issue* permission in that project. Pick a project you can create issues in.
- **"Jira rejected the issue (400)… `<field>`: …"** — a required field on that
  project's create screen isn't being sent. Priority is retried automatically;
  anything else means that project/issue type needs fields Ptah can't provide — pick a
  simpler issue type (e.g. *Task*).
- **"Could not reach Jira…"** — the base URL is wrong or the network is down. It must
  be the full `https://…` site root, with no `/jira` or `/browse` path.
- **"This OS keychain is unavailable"** — on a headless Linux box with no unlocked
  keyring, `safeStorage` can't encrypt the token. Run Ptah in a desktop session, or
  set up libsecret / `gnome-keyring`.
- **The link didn't appear on the ticket** — the issue was still created in Jira (the
  dialog shows its key). Reopen the ticket; if the URL is missing, add it by hand from
  the key.
