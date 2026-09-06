import yaml from 'js-yaml';
import type { Notebook } from '@models/Notebook';
import { isValidNotebookKey } from '@models/Notebook';
import type { FileStore } from './FileStore';

/** Reads and writes `notebook.yml` files and owns the per-notebook id counter. */
export class NotebookRepository {
  constructor(private readonly store: FileStore) {}

  async list(): Promise<Notebook[]> {
    const keys = await this.store.listDirs(this.store.notebooksDir());
    const notebooks: Notebook[] = [];
    for (const key of keys) {
      const notebook = await this.tryRead(key);
      if (notebook) notebooks.push(notebook);
    }
    return notebooks.sort((a, b) => a.key.localeCompare(b.key));
  }

  async get(key: string): Promise<Notebook> {
    const notebook = await this.tryRead(key);
    if (!notebook) throw new Error(`Notebook "${key}" not found.`);
    return notebook;
  }

  async exists(key: string): Promise<boolean> {
    return this.store.exists(this.store.notebookFile(key));
  }

  async create(notebook: Notebook): Promise<Notebook> {
    if (!isValidNotebookKey(notebook.key)) {
      throw new Error(`Invalid notebook key "${notebook.key}".`);
    }
    if (await this.exists(notebook.key)) {
      throw new Error(`Notebook "${notebook.key}" already exists.`);
    }
    await this.store.ensureDir(this.store.notesDir(notebook.key));
    await this.write(notebook);
    return notebook;
  }

  async write(notebook: Notebook): Promise<void> {
    const text = yaml.dump(
      {
        key: notebook.key,
        name: notebook.name,
        counter: notebook.counter,
        created: notebook.created,
      },
      { lineWidth: -1, sortKeys: false },
    );
    await this.store.writeText(this.store.notebookFile(notebook.key), text);
  }

  /** Reserve the next note number, persisting the bumped counter. */
  async bumpCounter(key: string): Promise<number> {
    const notebook = await this.get(key);
    notebook.counter += 1;
    await this.write(notebook);
    return notebook.counter;
  }

  /** Permanently remove the notebook folder and everything in it. */
  async delete(key: string): Promise<void> {
    await this.store.remove(this.store.notebookDir(key));
  }

  private async tryRead(key: string): Promise<Notebook | null> {
    const file = this.store.notebookFile(key);
    if (!(await this.store.exists(file))) return null;
    const parsed = yaml.load(await this.store.readText(file));
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;
    return {
      key: String(p.key ?? key),
      name: String(p.name ?? key),
      counter: Number(p.counter ?? 0),
      created: String(p.created ?? new Date(0).toISOString()),
    };
  }
}
