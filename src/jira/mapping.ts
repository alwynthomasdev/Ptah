/**
 * Pure Ptah -> Jira field mapping. No `electron`, no I/O — unit-testable on its
 * own. Shared by `src/jira/client.ts` and `src/jira/integration.ts`.
 */

import type { Priority, Ticket } from '@models/Ticket';

/**
 * Ptah priority -> Jira Cloud default priority name. The two scales line up
 * one-to-one on a stock Jira Cloud site (Highest / High / Medium / Low /
 * Lowest). If the target project's create screen renames or omits the priority
 * field, the push retries without priority rather than failing — see
 * `pushTicket` in `src/jira/integration.ts`.
 */
export const PTAH_TO_JIRA_PRIORITY: Record<Priority, string> = {
  lowest: 'Lowest',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  highest: 'Highest',
};

export interface CreateFieldsInput {
  /** Jira project id (not key). */
  projectId: string;
  /** Jira issue type id. */
  issueTypeId: string;
  /** When false, the `priority` field is left out entirely. Defaults to true. */
  includePriority?: boolean;
}

/**
 * Body for Jira `POST /rest/api/2/issue`. Uses the v2 REST API so `description`
 * is a plain string — Ptah's Markdown is sent as-is, not converted to ADF.
 */
export function buildCreateFields(
  ticket: Pick<Ticket, 'title' | 'description' | 'priority'>,
  { projectId, issueTypeId, includePriority = true }: CreateFieldsInput,
): { fields: Record<string, unknown> } {
  const fields: Record<string, unknown> = {
    project: { id: projectId },
    issuetype: { id: issueTypeId },
    summary: ticket.title,
  };
  const description = ticket.description.trim();
  if (description) fields.description = description;
  if (includePriority) fields.priority = { name: PTAH_TO_JIRA_PRIORITY[ticket.priority] };
  return { fields };
}

/** `https://site/browse/KEY-1` from a base URL that may carry a trailing slash. */
export function jiraBrowseUrl(baseUrl: string, issueKey: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/browse/${issueKey}`;
}

/**
 * The first `urls` entry that already points at an issue on this Jira site, or
 * undefined. Lets the push dialog warn before creating a second issue.
 */
export function alreadyPushedUrl(ticket: Pick<Ticket, 'urls'>, baseUrl: string): string | undefined {
  const prefix = `${baseUrl.replace(/\/+$/, '')}/browse/`;
  return ticket.urls.find((u) => u.startsWith(prefix));
}
