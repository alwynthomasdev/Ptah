/**
 * Thin Jira Cloud REST client. No `electron`, no config access — construct it
 * with resolved credentials and call it. Uses the global `fetch` (Node 20 /
 * Electron main) with an `AbortController` timeout; no HTTP dependency.
 *
 * Read calls use `/rest/api/2/...`; issue creation posts to `/rest/api/2/issue`
 * so `description` can be a plain string rather than ADF.
 */

import type { JiraIssueType, JiraProject } from '@shared/ipc';

export interface JiraClientOptions {
  baseUrl: string;
  email: string;
  token: string;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Per-request timeout in ms. Defaults to 15s. */
  timeoutMs?: number;
}

/** A Jira REST failure with the site's own message(s) already unpacked. */
export class JiraApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 for network/timeout failures. */
    readonly status: number,
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

interface RawProject {
  id: string | number;
  key: string;
  name: string;
}

interface RawIssueType {
  id: string | number;
  name: string;
  subtask?: boolean;
}

export class JiraClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: JiraClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.authHeader = `Basic ${Buffer.from(`${opts.email}:${opts.token}`).toString('base64')}`;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
  }

  /** Authenticated user — a lightweight credential check. */
  async myself(): Promise<{ displayName: string }> {
    const me = (await this.request('GET', '/rest/api/2/myself')) as {
      displayName?: string;
      accountId?: string;
    };
    return { displayName: me.displayName ?? me.accountId ?? 'Jira user' };
  }

  /** Projects visible to the user. Paginated, capped so a huge org can't hang. */
  async listProjects(query?: string): Promise<JiraProject[]> {
    const out: JiraProject[] = [];
    const pageSize = 50;
    const maxProjects = 500;
    for (let startAt = 0; startAt < maxProjects; startAt += pageSize) {
      const params = new URLSearchParams({
        startAt: String(startAt),
        maxResults: String(pageSize),
        orderBy: 'name',
      });
      if (query) params.set('query', query);
      const page = (await this.request(
        'GET',
        `/rest/api/2/project/search?${params.toString()}`,
      )) as { values?: RawProject[]; isLast?: boolean };
      const values = page.values ?? [];
      for (const p of values) out.push({ id: String(p.id), key: p.key, name: p.name });
      if (values.length === 0 || page.isLast !== false) break;
    }
    return out;
  }

  /** Non-subtask issue types for a project id. */
  async listIssueTypes(projectId: string): Promise<JiraIssueType[]> {
    try {
      const page = (await this.request(
        'GET',
        `/rest/api/2/issue/createmeta/${encodeURIComponent(projectId)}/issuetypes?maxResults=100`,
      )) as { values?: RawIssueType[] };
      const values = page.values ?? [];
      if (values.length) return mapIssueTypes(values);
    } catch (e) {
      if (!(e instanceof JiraApiError) || e.status !== 404) throw e;
    }
    // Older Cloud sites: fall back to the project resource's embedded list.
    const project = (await this.request(
      'GET',
      `/rest/api/2/project/${encodeURIComponent(projectId)}`,
    )) as { issueTypes?: RawIssueType[] };
    return mapIssueTypes(project.issueTypes ?? []);
  }

  /** Create an issue from a `{ fields }` body (see `buildCreateFields`). */
  async createIssue(body: {
    fields: Record<string, unknown>;
  }): Promise<{ key: string; id: string }> {
    const res = (await this.request('POST', '/rest/api/2/issue', body)) as {
      key: string;
      id: string;
    };
    return { key: res.key, id: res.id };
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new JiraApiError(
          `Jira did not respond within ${Math.round(this.timeoutMs / 1000)}s.`,
          0,
        );
      }
      throw new JiraApiError(
        `Could not reach Jira at ${this.baseUrl}. Check the base URL and your network.`,
        0,
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    if (res.ok) return text ? JSON.parse(text) : {};
    throw new JiraApiError(explain(res.status, text), res.status);
  }
}

function mapIssueTypes(raw: RawIssueType[]): JiraIssueType[] {
  const seen = new Set<string>();
  const out: JiraIssueType[] = [];
  for (const t of raw) {
    if (t.subtask) continue;
    const id = String(t.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: t.name });
  }
  return out;
}

function explain(status: number, text: string): string {
  const jiraMsg = extractJiraMessage(text);
  const tail = jiraMsg ? ` ${jiraMsg}` : '';
  switch (status) {
    case 401:
      return 'Jira rejected the credentials (401). Check the account email and API token.';
    case 403:
      return `Jira denied the request (403).${tail}`;
    case 404:
      return `Jira resource not found (404).${tail}`;
    case 400:
      return `Jira rejected the issue (400).${tail}`;
    default:
      return `Jira request failed (${status}).${tail}`;
  }
}

function extractJiraMessage(text: string): string {
  try {
    const body = JSON.parse(text) as {
      errorMessages?: string[];
      errors?: Record<string, string>;
    };
    const parts = [
      ...(body.errorMessages ?? []),
      ...Object.entries(body.errors ?? {}).map(([field, msg]) => `${field}: ${msg}`),
    ];
    return parts.join('; ');
  } catch {
    return '';
  }
}
