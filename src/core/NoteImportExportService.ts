import AdmZip from 'adm-zip';
import type { Note } from '@models/Note';
import { formatId } from '@shared/ids';
import type { FileStore } from '@storage/FileStore';
import type { NotebookRepository } from '@storage/NotebookRepository';
import { markdownToNote, noteToMarkdown } from '@storage/NoteRepository';
import type { NoteRepository } from '@storage/NoteRepository';

/**
 * Moves notes in and out of the data directory as portable files, mirroring
 * `ImportExportService` for tickets. Notes have no attachments, so a single note
 * always exports as a plain `.md` (frontmatter + body) and a notebook exports as
 * a `.zip` laid out as `notes/<ID>.md`. Import re-allocates ids in the target
 * notebook, so a round-trip preserves content but not ids.
 */
export class NoteImportExportService {
  constructor(
    private readonly store: FileStore,
    private readonly notebooks: NotebookRepository,
    private readonly notes: NoteRepository,
  ) {}

  // ---- export --------------------------------------------------------

  async exportNotes(noteIds: string[], destPath: string): Promise<void> {
    const loaded: Note[] = [];
    for (const id of noteIds) loaded.push(await this.notes.get(id));

    if (destPath.toLowerCase().endsWith('.md')) {
      if (loaded.length !== 1) {
        throw new Error('Markdown export needs exactly one note; use a .zip destination.');
      }
      await this.store.writeText(destPath, noteToMarkdown(loaded[0]));
      return;
    }

    const zip = new AdmZip();
    for (const note of loaded) {
      zip.addFile(`notes/${note.id}.md`, Buffer.from(noteToMarkdown(note), 'utf8'));
    }
    await this.store.writeBytes(destPath, zip.toBuffer());
  }

  async exportNotebook(notebookKey: string, destPath: string): Promise<void> {
    const notes = await this.notes.listForNotebook(notebookKey);
    await this.exportNotes(
      notes.map((n) => n.id),
      destPath,
    );
  }

  // ---- import --------------------------------------------------------

  async importFromFiles(srcPaths: string[], targetNotebookKey: string): Promise<Note[]> {
    if (!(await this.notebooks.exists(targetNotebookKey))) {
      throw new Error(`Notebook "${targetNotebookKey}" does not exist.`);
    }
    const created: Note[] = [];
    for (const src of srcPaths) {
      if (src.toLowerCase().endsWith('.zip')) {
        created.push(...(await this.importZip(src, targetNotebookKey)));
      } else {
        created.push(await this.saveImported(await this.store.readText(src), targetNotebookKey));
      }
    }
    return created;
  }

  private async importZip(src: string, notebookKey: string): Promise<Note[]> {
    const zip = new AdmZip(await this.store.readBytes(src));
    const created: Note[] = [];
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.replace(/\\/g, '/');
      if (!/\.md$/i.test(name)) continue;
      created.push(await this.saveImported(entry.getData().toString('utf8'), notebookKey));
    }
    return created;
  }

  private async saveImported(raw: string, notebookKey: string): Promise<Note> {
    const newId = formatId(notebookKey, await this.notebooks.bumpCounter(notebookKey));
    const parsed = markdownToNote(newId, notebookKey, raw);
    await this.notes.save({ ...parsed, id: newId, notebook: notebookKey, deletedAt: null });
    return this.notes.get(newId);
  }
}
