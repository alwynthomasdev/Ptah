import { defineStore } from 'pinia';
import type {
  JiraConnectionStatus,
  JiraIssueType,
  JiraProject,
  JiraPushResult,
  JiraSettings,
  JiraSettingsInput,
} from '@shared/ipc';
import { call, ptah } from '../api';

interface State {
  settings: JiraSettings | null;
  loaded: boolean;
}

/** One-way "push to Jira" integration. Backend lives in `src/jira/**`. */
export const useJiraStore = defineStore('jira', {
  state: (): State => ({ settings: null, loaded: false }),
  getters: {
    /** True once a base URL, email, and token are all stored. */
    configured: (s): boolean => Boolean(s.settings?.connected && s.settings.baseUrl && s.settings.email),
    baseUrl: (s): string => s.settings?.baseUrl ?? '',
  },
  actions: {
    async load() {
      this.settings = await call(ptah.jira.getSettings());
      this.loaded = true;
    },
    async save(input: JiraSettingsInput) {
      this.settings = await call(ptah.jira.saveSettings(input));
      return this.settings;
    },
    async clear() {
      this.settings = await call(ptah.jira.clearSettings());
    },
    test(): Promise<JiraConnectionStatus> {
      return call(ptah.jira.testConnection());
    },
    listProjects(query?: string): Promise<JiraProject[]> {
      return call(ptah.jira.listProjects(query));
    },
    listIssueTypes(projectId: string): Promise<JiraIssueType[]> {
      return call(ptah.jira.listIssueTypes(projectId));
    },
    push(ticketId: string, opts: { projectId: string; issueTypeId: string }): Promise<JiraPushResult> {
      return call(ptah.jira.pushTicket(ticketId, opts));
    },
  },
});
