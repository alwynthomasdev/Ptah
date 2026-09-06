import type { NewProjectInput, Project } from '@models/Project';
import type { NewTicketInput, Ticket, TicketPatch } from '@models/Ticket';
import type { Result } from './result';

/** App configuration persisted in Electron `userData/config.json`. */
export interface AppConfig {
  dataDir: string;
  theme: 'light' | 'dark' | 'system';
  defaultProjectName: string;
}

/** Info about an available update, surfaced from GitHub Releases via `electron-updater`. */
export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

/** A Claude integration target: the CLI or the desktop app. */
export type ClaudeTarget = 'code' | 'desktop';

/** Install/connection status for one Claude target. Canonical definition — `src/mcp/integration.ts` imports these. */
export interface ClaudeStatus {
  installed: boolean;
  connected: boolean;
}

export interface ClaudeDetectResult {
  code: ClaudeStatus;
  desktop: ClaudeStatus;
}

/**
 * Jira integration (one-way push to Jira Cloud). Canonical definitions —
 * `src/jira/integration.ts` imports these. The API token is never part of any
 * type crossing the boundary; the renderer only learns whether one is stored
 * via {@link JiraSettings.connected}.
 */
export interface JiraSettings {
  /** Site base URL, e.g. `https://your-org.atlassian.net`. Empty until configured. */
  baseUrl: string;
  /** Atlassian account email used for Basic auth. Empty until configured. */
  email: string;
  /** True when an API token is stored (encrypted) on disk. */
  connected: boolean;
}

/** What the Settings form sends. Omit or empty `token` to keep the stored one. */
export interface JiraSettingsInput {
  baseUrl: string;
  email: string;
  token?: string;
}

/** Result of a live `GET /myself` credential check. */
export interface JiraConnectionStatus {
  ok: boolean;
  /** Display name of the authenticated Atlassian user, when `ok`. */
  displayName?: string;
  /** Human-readable failure reason, when not `ok`. */
  error?: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
}

/** Outcome of a successful push: the created issue's key and browse URL. */
export interface JiraPushResult {
  issueKey: string;
  url: string;
}

/** IPC channel names. One place so preload and main can't drift. */
export const IPC = {
  configGet: 'config:get',
  configSetTheme: 'config:setTheme',
  configSetDataDir: 'config:setDataDir',
  configSetDefaultProjectName: 'config:setDefaultProjectName',
  configPickDataDir: 'config:pickDataDir',

  projectsList: 'projects:list',
  projectsCreate: 'projects:create',
  projectsRename: 'projects:rename',
  projectsDelete: 'projects:delete',

  ticketsList: 'tickets:list',
  ticketsListChildren: 'tickets:listChildren',
  ticketsGet: 'tickets:get',
  ticketsCreate: 'tickets:create',
  ticketsUpdate: 'tickets:update',
  ticketsChangeProject: 'tickets:changeProject',
  ticketsDelete: 'tickets:delete',
  /** Main -> renderer: a ticket was created in another window; reload lists. */
  ticketsChanged: 'tickets:changed',

  binList: 'bin:list',
  binRestore: 'bin:restore',
  binPurge: 'bin:purge',
  binEmpty: 'bin:empty',

  attachmentsAdd: 'attachments:add',
  attachmentsRemove: 'attachments:remove',
  attachmentsOpen: 'attachments:open',
  attachmentsReveal: 'attachments:reveal',

  ioExportTicket: 'io:exportTicket',
  ioExportProject: 'io:exportProject',
  ioImport: 'io:import',

  systemOpenExternal: 'system:openExternal',

  updatesCheck: 'updates:check',
  updatesDownload: 'updates:download',
  updatesInstall: 'updates:install',

  claudeDetect: 'claude:detect',
  claudeConnect: 'claude:connect',
  claudeDisconnect: 'claude:disconnect',

  jiraGetSettings: 'jira:getSettings',
  jiraSaveSettings: 'jira:saveSettings',
  jiraClearSettings: 'jira:clearSettings',
  jiraTestConnection: 'jira:testConnection',
  jiraListProjects: 'jira:listProjects',
  jiraListIssueTypes: 'jira:listIssueTypes',
  jiraPushTicket: 'jira:pushTicket',

  windowOpenQuickAdd: 'window:openQuickAdd',
  windowCloseQuickAdd: 'window:closeQuickAdd',
} as const;

/**
 * The typed surface exposed on `window.ptah` by the preload script. Every call
 * resolves to a Result so the renderer handles failure explicitly.
 */
export interface PtahApi {
  config: {
    get(): Promise<Result<AppConfig>>;
    setTheme(theme: AppConfig['theme']): Promise<Result<AppConfig>>;
    setDataDir(dir: string): Promise<Result<AppConfig>>;
    setDefaultProjectName(name: string): Promise<Result<AppConfig>>;
    pickDataDir(): Promise<Result<AppConfig | null>>;
  };
  projects: {
    list(): Promise<Result<Project[]>>;
    create(input: NewProjectInput): Promise<Result<Project>>;
    rename(key: string, name: string): Promise<Result<Project>>;
    delete(key: string): Promise<Result<void>>;
  };
  tickets: {
    list(projectKey?: string): Promise<Result<Ticket[]>>;
    /** Live tickets whose `parent` is `id`, across every project. */
    listChildren(id: string): Promise<Result<Ticket[]>>;
    get(id: string): Promise<Result<Ticket>>;
    create(input: NewTicketInput): Promise<Result<Ticket>>;
    update(id: string, patch: TicketPatch): Promise<Result<Ticket>>;
    /** Move a ticket to a different project, minting it a new id. */
    changeProject(id: string, targetProjectKey: string): Promise<Result<Ticket>>;
    delete(id: string): Promise<Result<void>>;
  };
  bin: {
    list(): Promise<Result<Ticket[]>>;
    restore(id: string): Promise<Result<Ticket>>;
    purge(id: string): Promise<Result<void>>;
    empty(): Promise<Result<void>>;
  };
  attachments: {
    /** Open a native picker, copy the chosen files onto the ticket. */
    add(ticketId: string): Promise<Result<Ticket>>;
    remove(ticketId: string, filename: string): Promise<Result<Ticket>>;
    /** Open the attachment in the OS default application. */
    open(ticketId: string, filename: string): Promise<Result<void>>;
    /** Show the attachment in the OS file manager. */
    reveal(ticketId: string, filename: string): Promise<Result<void>>;
  };
  io: {
    /** Export one ticket; picks `.md` or `.zip` by whether it has attachments.
     *  Resolves `false` if the user cancels the save dialog. */
    exportTicket(ticketId: string): Promise<Result<boolean>>;
    /** Export a whole project to a `.zip`. Resolves `false` on cancel. */
    exportProject(projectKey: string, opts: { media: boolean }): Promise<Result<boolean>>;
    /** Open a picker for `.md` / `.zip` files and import them into a project. */
    import(targetProjectKey: string): Promise<Result<Ticket[]>>;
  };
  system: {
    /** Open an `http(s)`/`mailto` URL in the OS default handler. */
    openExternal(url: string): Promise<Result<void>>;
  };
  updates: {
    /** Check GitHub Releases for a newer version. Resolves `null` when already current. */
    check(): Promise<Result<UpdateInfo | null>>;
    /** Download the update found by `check()`. */
    download(): Promise<Result<void>>;
    /** Quit and install the downloaded update. */
    install(): Promise<Result<void>>;
  };
  claude: {
    /** Installed/connected status for both Claude Code and Claude Desktop. */
    detect(): Promise<Result<ClaudeDetectResult>>;
    /** Register Ptah's MCP server with the given target. */
    connect(target: ClaudeTarget): Promise<Result<ClaudeStatus>>;
    /** Unregister Ptah's MCP server from the given target. */
    disconnect(target: ClaudeTarget): Promise<Result<ClaudeStatus>>;
  };
  jira: {
    /** Stored base URL / email, and whether a token is saved. No network call. */
    getSettings(): Promise<Result<JiraSettings>>;
    /** Persist base URL / email, and the token when a non-empty one is given. */
    saveSettings(input: JiraSettingsInput): Promise<Result<JiraSettings>>;
    /** Forget the stored credentials (including the token). */
    clearSettings(): Promise<Result<JiraSettings>>;
    /** Verify the stored credentials against `GET /rest/api/2/myself`. */
    testConnection(): Promise<Result<JiraConnectionStatus>>;
    /** Jira projects visible to the authenticated user, optionally filtered. */
    listProjects(query?: string): Promise<Result<JiraProject[]>>;
    /** Non-subtask issue types available for the given Jira project id. */
    listIssueTypes(projectId: string): Promise<Result<JiraIssueType[]>>;
    /**
     * Create a Jira issue from the ticket's title, description, and priority,
     * then append the new issue's browse URL to the ticket's `urls`.
     */
    pushTicket(
      ticketId: string,
      opts: { projectId: string; issueTypeId: string },
    ): Promise<Result<JiraPushResult>>;
  };
  window: {
    /** Open (or focus) the standalone Quick Add window, optionally preselecting a project. */
    openQuickAdd(projectKey?: string): Promise<Result<void>>;
    /** Close the Quick Add window if it is open. */
    closeQuickAdd(): Promise<Result<void>>;
  };
  events: {
    /**
     * Fires in every window other than the one that created the ticket, after a
     * successful `tickets:create`. Returns an unsubscribe function.
     */
    onTicketsChanged(listener: () => void): () => void;
  };
}
