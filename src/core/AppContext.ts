import { FileStore } from '@storage/FileStore';
import { ProjectRepository } from '@storage/ProjectRepository';
import { TicketRepository } from '@storage/TicketRepository';
import { NotebookRepository } from '@storage/NotebookRepository';
import { NoteRepository } from '@storage/NoteRepository';
import { ProjectService } from './ProjectService';
import { TicketService } from './TicketService';
import { RecycleBinService } from './RecycleBinService';
import { ImportExportService } from './ImportExportService';
import { NotebookService } from './NotebookService';
import { NoteService } from './NoteService';
import { NoteRecycleBinService } from './NoteRecycleBinService';
import { NoteImportExportService } from './NoteImportExportService';

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
  readonly notebooks: NotebookService;
  readonly notes: NoteService;
  readonly noteRecycleBin: NoteRecycleBinService;
  readonly noteImportExport: NoteImportExportService;

  constructor(dataDir: string) {
    this.store = new FileStore(dataDir);
    const projectRepo = new ProjectRepository(this.store);
    const ticketRepo = new TicketRepository(this.store);
    const notebookRepo = new NotebookRepository(this.store);
    const noteRepo = new NoteRepository(this.store);
    this.recycleBin = new RecycleBinService(this.store, projectRepo);
    this.projects = new ProjectService(projectRepo);
    this.tickets = new TicketService(ticketRepo, projectRepo, this.recycleBin);
    this.importExport = new ImportExportService(this.store, projectRepo, ticketRepo);
    this.noteRecycleBin = new NoteRecycleBinService(this.store, notebookRepo);
    this.notebooks = new NotebookService(notebookRepo);
    this.notes = new NoteService(noteRepo, notebookRepo, this.noteRecycleBin);
    this.noteImportExport = new NoteImportExportService(this.store, notebookRepo, noteRepo);
  }

  /** Create the base folder layout if this is a fresh data directory. */
  async init(
    defaultProjectName: string = 'To Do',
    defaultNotebookName: string = 'Notebook',
  ): Promise<void> {
    await this.store.ensureDir(this.store.projectsDir());
    await this.projects.ensureDefaultProject(defaultProjectName);
    await this.store.ensureDir(this.store.notebooksDir());
    await this.notebooks.ensureDefaultNotebook(defaultNotebookName);
  }

  get dataDir(): string {
    return this.store.dataDir;
  }
}
