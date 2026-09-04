import type { NewProjectInput, Project } from '@models/Project';
import type { NewTicketInput, Ticket, TicketPatch } from '@models/Ticket';
import type { Result } from './result';

/** App configuration persisted in Electron `userData/config.json`. */
export interface AppConfig {
  dataDir: string;
  theme: 'light' | 'dark' | 'system';
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

/** IPC channel names. One place so preload and main can't drift. */
export const IPC = {
  configGet: 'config:get',
  configSetTheme: 'config:setTheme',
  configSetDataDir: 'config:setDataDir',
  configPickDataDir: 'config:pickDataDir',

  projectsList: 'projects:list',
  projectsCreate: 'projects:create',
  projectsRename: 'projects:rename',
  projectsDelete: 'projects:delete',

  ticketsList: 'tickets:list',
  ticketsGet: 'tickets:get',
  ticketsCreate: 'tickets:create',
  ticketsUpdate: 'tickets:update',
  ticketsDelete: 'tickets:delete',

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
    get(id: string): Promise<Result<Ticket>>;
    create(input: NewTicketInput): Promise<Result<Ticket>>;
    update(id: string, patch: TicketPatch): Promise<Result<Ticket>>;
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
}
