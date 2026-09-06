import type { Note } from '@models/Note';
import { parseId } from '@shared/ids';
import type { FileStore } from '@storage/FileStore';
import { markdownToNote, noteToMarkdown } from '@storage/NoteRepository';
import type { NotebookRepository } from '@storage/NotebookRepository';

/**
 * Soft-delete for notes. A deleted note's `.md` file is moved under
 * `.recyclebin/notes/`, stamped with `deletedAt`. Restore moves it back; purge
 * removes it for good. Deleting a whole notebook bypasses this and is permanent
 * (see NotebookService).
 */
export class NoteRecycleBinService {
  constructor(
    private readonly store: FileStore,
    private readonly notebooks: NotebookRepository,
  ) {}

  async list(): Promise<Note[]> {
    const names = await this.store.listFiles(this.store.recycledNotesDir(), '.md');
    const notes: Note[] = [];
    for (const name of names) {
      const id = name.replace(/\.md$/i, '');
      const raw = await this.store.readText(this.store.recycledNoteFile(id));
      notes.push(markdownToNote(id, parseId(id).project, raw));
    }
    return notes.sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
  }

  async moveToBin(note: Note, now: Date = new Date()): Promise<void> {
    const stamped: Note = { ...note, deletedAt: now.toISOString() };
    await this.store.writeText(this.store.recycledNoteFile(note.id), noteToMarkdown(stamped));
    await this.store.remove(this.store.noteFile(note.notebook, note.id));
  }

  async restore(id: string): Promise<Note> {
    const binFile = this.store.recycledNoteFile(id);
    if (!(await this.store.exists(binFile))) {
      throw new Error(`Note "${id}" is not in the recycle bin.`);
    }
    const { project: notebook } = parseId(id);
    if (!(await this.notebooks.exists(notebook))) {
      throw new Error(`Cannot restore "${id}": notebook "${notebook}" no longer exists.`);
    }
    const note = markdownToNote(id, notebook, await this.store.readText(binFile));
    note.deletedAt = null;
    await this.store.writeText(this.store.noteFile(notebook, id), noteToMarkdown(note));
    await this.store.remove(binFile);
    return note;
  }

  async purge(id: string): Promise<void> {
    await this.store.remove(this.store.recycledNoteFile(id));
  }

  async empty(): Promise<void> {
    await this.store.remove(this.store.recycledNotesDir());
  }
}
