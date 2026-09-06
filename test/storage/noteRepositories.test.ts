import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileStore } from '@storage/FileStore';
import { NotebookRepository } from '@storage/NotebookRepository';
import { NoteRepository, markdownToNote, noteToMarkdown } from '@storage/NoteRepository';
import { createNotebook } from '@models/Notebook';
import { createNote } from '@models/Note';
import { makeTmpDir } from '../helpers/tmp';

let dir: string;
let cleanup: () => Promise<void>;
let store: FileStore;
let notebooks: NotebookRepository;
let notes: NoteRepository;

beforeEach(async () => {
  ({ dir, cleanup } = await makeTmpDir());
  store = new FileStore(dir);
  notebooks = new NotebookRepository(store);
  notes = new NoteRepository(store);
});
afterEach(() => cleanup());

describe('NotebookRepository', () => {
  it('creates, lists, and rejects duplicates', async () => {
    await notebooks.create(createNotebook({ key: 'NB', name: 'Notebook' }));
    expect((await notebooks.list()).map((n) => n.key)).toEqual(['NB']);
    await expect(notebooks.create(createNotebook({ key: 'NB', name: 'Dup' }))).rejects.toThrow();
  });

  it('bumps the counter monotonically and persists it', async () => {
    await notebooks.create(createNotebook({ key: 'NB', name: 'Notebook' }));
    expect(await notebooks.bumpCounter('NB')).toBe(1);
    expect(await notebooks.bumpCounter('NB')).toBe(2);
    expect((await notebooks.get('NB')).counter).toBe(2);
  });

  it('delete removes the whole notebook folder', async () => {
    await notebooks.create(createNotebook({ key: 'NB', name: 'Notebook' }));
    await notebooks.delete('NB');
    expect(await store.exists(store.notebookDir('NB'))).toBe(false);
  });
});

describe('NoteRepository', () => {
  beforeEach(async () => {
    await notebooks.create(createNotebook({ key: 'NB', name: 'Notebook' }));
  });

  it('round-trips a note through its .md file', async () => {
    const created = createNote(
      'NB-1',
      { title: 'First', notebook: 'NB', labels: ['b', 'a'], body: 'Body **text**' },
      new Date('2026-01-01T00:00:00.000Z'),
    );
    await notes.save(created);

    const file = store.noteFile('NB', 'NB-1');
    expect(await store.exists(file)).toBe(true);
    expect(await store.readText(file)).toMatch(/^---\n/);

    const back = await notes.get('NB-1');
    expect(back.title).toBe('First');
    expect(back.labels).toEqual(['a', 'b']);
    expect(back.body).toBe('Body **text**');
    expect(back.notebook).toBe('NB');
  });

  it('serialization is stable: load(save(x)) === load(x)', () => {
    const n = createNote('NB-2', { title: 'x', notebook: 'NB', body: '\n\nhi\n\n' });
    const once = markdownToNote('NB-2', 'NB', noteToMarkdown(n));
    const twice = markdownToNote('NB-2', 'NB', noteToMarkdown(once));
    expect(twice).toEqual(once);
  });

  it('markdownToNote falls back defensively on a corrupt file', () => {
    const back = markdownToNote('NB-9', 'NB', '---\nlabels: not-an-array\n---\n\nbody');
    expect(back.id).toBe('NB-9');
    expect(back.notebook).toBe('NB');
    expect(back.labels).toEqual([]);
    expect(back.updated).toBe(back.created);
  });

  it('lists notes for a notebook', async () => {
    await notes.save(createNote('NB-1', { title: 'A', notebook: 'NB' }));
    await notes.save(createNote('NB-2', { title: 'B', notebook: 'NB' }));
    expect((await notes.listForNotebook('NB')).map((n) => n.id).sort()).toEqual(['NB-1', 'NB-2']);
  });

  it('move rewrites the file under the new id/notebook', async () => {
    await notebooks.create(createNotebook({ key: 'WORK', name: 'Work' }));
    const n = await notes.save(createNote('NB-1', { title: 'A', notebook: 'NB' }));
    const moved = await notes.move(n, 'WORK-1', 'WORK');
    expect(moved.id).toBe('WORK-1');
    expect(await store.exists(store.noteFile('NB', 'NB-1'))).toBe(false);
    expect((await notes.get('WORK-1')).title).toBe('A');
  });
});
