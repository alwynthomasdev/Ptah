import { FileStore } from '@storage/FileStore';
import { ProjectRepository } from '@storage/ProjectRepository';
import { TicketRepository } from '@storage/TicketRepository';
import { ProjectService } from './ProjectService';
import { TicketService } from './TicketService';
import { RecycleBinService } from './RecycleBinService';
import { ImportExportService } from './ImportExportService';

/**
 * Bundles every service for a given data directory. Rebuilt whenever the user
 * points Ptah at a different `dataDir`.
 */
export class AppContext {
  readonly store: FileStore;
  readonly projects: ProjectService;
  readonly tickets: TicketService;
  readonly recycleBin: RecycleBinService;
  readonly importExport: ImportExportService;

  constructor(dataDir: string) {
    this.store = new FileStore(dataDir);
    const projectRepo = new ProjectRepository(this.store);
    const ticketRepo = new TicketRepository(this.store);
    this.recycleBin = new RecycleBinService(this.store, projectRepo);
    this.projects = new ProjectService(projectRepo);
    this.tickets = new TicketService(ticketRepo, projectRepo, this.recycleBin);
    this.importExport = new ImportExportService(this.store, projectRepo, ticketRepo);
  }

  /** Create the base folder layout if this is a fresh data directory. */
  async init(): Promise<void> {
    await this.store.ensureDir(this.store.projectsDir());
    await this.projects.ensureDefaultProject();
  }

  get dataDir(): string {
    return this.store.dataDir;
  }
}
