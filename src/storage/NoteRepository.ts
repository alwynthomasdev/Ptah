import type { Note } from '@models/Note';
import { normalizeLabels } from '@models/Ticket';
import { parseId } from '@shared/ids';
import type { FileStore } from './FileStore';
import { parseMarkdown, stringifyMarkdown } from './markdownFile';

/**
 * Maps Note objects to/from their `<id>.md` files. Frontmatter holds the
 * metadata; the body is the note text. Notes have no attachments.
 */
export class NoteRepository {
  constructor(private readonly store: FileStore) {}

  async listForNotebook(notebookKey: string): Promise<Note[]> {
    const names = await this.store.listFiles(this.store.notesDir(notebookKey), '.md');
    const notes: Note[] = [];
    for (const name of names) {
      const id = name.replace(/\.md$/i, '');
      const note = await this.tryGet(notebookKey, id);
      if (note) notes.push(note);
    }
    return notes;
  }

  async get(id: string): Promise<Note> {
    const { project: notebook } = parseId(id);
    const note = await this.tryGet(notebook, id);
    if (!note) throw new Error(`Note "${id}" not found.`);
    return note;
  }

  async exists(id: string): Promise<boolean> {
    const { project: notebook } = parseId(id);
    return this.store.exists(this.store.noteFile(notebook, id));
  }

  /** Create or overwrite the note file. */
  async save(note: Note): Promise<Note> {
    await this.store.writeText(this.store.noteFile(note.notebook, note.id), noteToMarkdown(note));
    return note;
  }

  /** Move a note to a new id/notebook: write the new file, remove the old. */
  async move(note: Note, newId: string, newNotebook: string): Promise<Note> {
    const moved: Note = { ...note, id: newId, notebook: newNotebook };
    await this.store.writeText(this.store.noteFile(newNotebook, newId), noteToMarkdown(moved));
    await this.store.remove(this.store.noteFile(note.notebook, note.id));
    return moved;
  }

  /** Hard-delete the note file. */
  async hardDelete(id: string): Promise<void> {
    const { project: notebook } = parseId(id);
    await this.store.remove(this.store.noteFile(notebook, id));
  }

  private async tryGet(notebookKey: string, id: string): Promise<Note | null> {
    const file = this.store.noteFile(notebookKey, id);
    if (!(await this.store.exists(file))) return null;
    const raw = await this.store.readText(file);
    return markdownToNote(id, notebookKey, raw);
  }
}

// ---- serialization (exported for tests) ---------------------------------

export function noteToMarkdown(note: Note): string {
  const data: Record<string, unknown> = {
    id: note.id,
    title: note.title,
    notebook: note.notebook,
    created: note.created,
    updated: note.updated,
    labels: note.labels,
  };
  if (note.deletedAt) data.deletedAt = note.deletedAt;
  return stringifyMarkdown(data, note.body ?? '');
}

export function markdownToNote(id: string, notebookKey: string, raw: string): Note {
  const { data, body } = parseMarkdown(raw);
  const labels = Array.isArray(data.labels) ? data.labels.map(String) : [];
  const created = String(data.created ?? new Date(0).toISOString());

  return {
    id: typeof data.id === 'string' && data.id ? data.id : id,
    title: String(data.title ?? id),
    notebook: typeof data.notebook === 'string' && data.notebook ? data.notebook : notebookKey,
    created,
    updated: typeof data.updated === 'string' && data.updated ? data.updated : created,
    labels: normalizeLabels(labels),
    // Mirror stringifyMarkdown's body normalization so load(save(x)) === load(x).
    body: body.replace(/^\r?\n+/, '').trimEnd(),
    deletedAt: typeof data.deletedAt === 'string' ? data.deletedAt : null,
  };
}
