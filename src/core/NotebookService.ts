import type { NewNotebookInput, Notebook } from '@models/Notebook';
import { createNotebook, DEFAULT_NOTEBOOK_KEY } from '@models/Notebook';
import type { NotebookRepository } from '@storage/NotebookRepository';

/** Notebook lifecycle. Deleting a notebook is permanent and takes its notes with it. */
export class NotebookService {
  constructor(private readonly notebooks: NotebookRepository) {}

  list(): Promise<Notebook[]> {
    return this.notebooks.list();
  }

  get(key: string): Promise<Notebook> {
    return this.notebooks.get(key);
  }

  async create(input: NewNotebookInput): Promise<Notebook> {
    return this.notebooks.create(createNotebook(input));
  }

  async rename(key: string, name: string): Promise<Notebook> {
    const notebook = await this.notebooks.get(key);
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Notebook name must not be empty.');
    notebook.name = trimmed;
    await this.notebooks.write(notebook);
    return notebook;
  }

  /** Permanently delete the notebook and every note in it. */
  async delete(key: string): Promise<void> {
    if (key === DEFAULT_NOTEBOOK_KEY) {
      throw new Error('The default notebook cannot be deleted.');
    }
    if (!(await this.notebooks.exists(key))) {
      throw new Error(`Notebook "${key}" not found.`);
    }
    await this.notebooks.delete(key);
  }

  async ensureDefaultNotebook(name: string = 'notebook'): Promise<void> {
    if (await this.notebooks.exists(DEFAULT_NOTEBOOK_KEY)) return;
    await this.notebooks.create(createNotebook({ key: DEFAULT_NOTEBOOK_KEY, name }));
  }
}
