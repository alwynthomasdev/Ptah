import type { NewProjectInput, Project } from '@models/Project';
import type { NewTicketInput, Ticket, TicketPatch } from '@models/Ticket';
import type { Result } from './result';

/** App configuration persisted in Electron `userData/config.json`. */
export interface AppConfig {
  dataDir: string;
  theme: 'light' | 'dark' | 'system';
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
}
