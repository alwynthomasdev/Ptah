import type { AppContext } from '@core/AppContext';
import type {
  JiraConnectionStatus,
  JiraIssueType,
  JiraProject,
  JiraPushResult,
  JiraSettings,
  JiraSettingsInput,
} from '@shared/ipc';
import { JiraApiError, JiraClient } from './client';
import { clearJiraSettings, loadJiraSettings, readJiraToken, saveJiraSettings } from './config';
import { buildCreateFields, jiraBrowseUrl } from './mapping';

/**
 * Main-process-only half of the Jira integration: credential storage plus the
 * REST calls to Jira Cloud. Only `src/main/ipc.ts` imports this. `client.ts`
 * and `mapping.ts` stay `electron`-free so they unit-test without Electron;
 * this file and `config.ts` may touch `electron`.
 */

export function getSettings(): Promise<JiraSettings> {
  return loadJiraSettings();
}

export function saveSettings(input: JiraSettingsInput): Promise<JiraSettings> {
  return saveJiraSettings(input);
}

export function clearSettings(): Promise<JiraSettings> {
  return clearJiraSettings();
}

/** Build a client from stored credentials, or throw a readable error. */
async function client(): Promise<{ jira: JiraClient; baseUrl: string }> {
  const settings = await loadJiraSettings();
  const token = await readJiraToken();
  if (!settings.baseUrl || !settings.email || !token) {
    throw new Error(
      'Jira is not fully configured. Add the base URL, email, and API token in Settings.',
    );
  }
  return {
    jira: new JiraClient({ baseUrl: settings.baseUrl, email: settings.email, token }),
    baseUrl: settings.baseUrl,
  };
}

export async function testConnection(): Promise<JiraConnectionStatus> {
  try {
    const { jira } = await client();
    const me = await jira.myself();
    return { ok: true, displayName: me.displayName };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listProjects(query?: string): Promise<JiraProject[]> {
  const { jira } = await client();
  return jira.listProjects(query?.trim() || undefined);
}

export async function listIssueTypes(projectId: string): Promise<JiraIssueType[]> {
  if (!projectId) throw new Error('A Jira project id is required.');
  const { jira } = await client();
  return jira.listIssueTypes(projectId);
}

/**
 * Create a Jira issue from the ticket's title, description, and priority, then
 * append the new issue's browse URL to the ticket's `urls`. If the project's
 * create screen has no priority field, retry once without it.
 */
export async function pushTicket(
  ctx: Pick<AppContext, 'tickets'>,
  ticketId: string,
  opts: { projectId: string; issueTypeId: string },
): Promise<JiraPushResult> {
  if (!opts?.projectId || !opts?.issueTypeId) {
    throw new Error('Pick a Jira project and issue type before pushing.');
  }
  const { jira, baseUrl } = await client();
  const ticket = await ctx.tickets.get(ticketId);

  let created: { key: string };
  try {
    created = await jira.createIssue(buildCreateFields(ticket, { ...opts, includePriority: true }));
  } catch (e) {
    if (e instanceof JiraApiError && e.status === 400 && /priority/i.test(e.message)) {
      created = await jira.createIssue(
        buildCreateFields(ticket, { ...opts, includePriority: false }),
      );
    } else {
      throw e;
    }
  }

  const url = jiraBrowseUrl(baseUrl, created.key);
  // `normalizeUrls` in the model dedupes exact matches, so a repeat is harmless.
  await ctx.tickets.update(ticketId, { urls: [...ticket.urls, url] });
  return { issueKey: created.key, url };
}
