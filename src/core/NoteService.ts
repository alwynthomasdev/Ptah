import type { NewNoteInput, Note, NotePatch } from '@models/Note';
import { applyNotePatch, createNote } from '@models/Note';
import { formatId } from '@shared/ids';
import type { NotebookRepository } from '@storage/NotebookRepository';
import type { NoteRepository } from '@storage/NoteRepository';
import type { NoteRecycleBinService } from './NoteRecycleBinService';

/** Orchestrates note CRUD across the note + notebook repositories. */
export class NoteService {
  constructor(
    private readonly notes: NoteRepository,
    private readonly notebooks: NotebookRepository,
    private readonly bin: NoteRecycleBinService,
  ) {}

  /** All live notes, optionally scoped to one notebook. */
  async list(notebookKey?: string): Promise<Note[]> {
    if (notebookKey) return this.notes.listForNotebook(notebookKey);
    const all: Note[] = [];
    for (const notebook of await this.notebooks.list()) {
      all.push(...(await this.notes.listForNotebook(notebook.key)));
    }
    return all;
  }

  get(id: string): Promise<Note> {
    return this.notes.get(id);
  }

  async create(input: NewNoteInput): Promise<Note> {
    if (!(await this.notebooks.exists(input.notebook))) {
      throw new Error(`Notebook "${input.notebook}" does not exist.`);
    }
    const n = await this.notebooks.bumpCounter(input.notebook);
    const note = createNote(formatId(input.notebook, n), input);
    return this.notes.save(note);
  }

  async update(id: string, patch: NotePatch): Promise<Note> {
    const current = await this.notes.get(id);
    return this.notes.save(applyNotePatch(current, patch));
  }

  /** Move a note to a different notebook, minting it a new id there. */
  async changeNotebook(id: string, targetNotebookKey: string): Promise<Note> {
    const current = await this.notes.get(id);
    const target = targetNotebookKey.trim().toUpperCase();
    if (!(await this.notebooks.exists(target))) {
      throw new Error(`Notebook "${target}" does not exist.`);
    }
    if (target === current.notebook) return current; // no-op, allowed
    const n = await this.notebooks.bumpCounter(target);
    return this.notes.move(current, formatId(target, n), target);
  }

  /** Soft-delete: move the note to the recycle bin. */
  async delete(id: string): Promise<void> {
    const note = await this.notes.get(id);
    await this.bin.moveToBin(note);
  }
}
