import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AppContext } from '@core/AppContext';
import { DEFAULT_NOTEBOOK_KEY } from '@models/Notebook';
import { makeTmpDir } from '../helpers/tmp';

let ctx: AppContext;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const t = await makeTmpDir();
  cleanup = t.cleanup;
  ctx = new AppContext(t.dir);
  await ctx.init();
});
afterEach(() => cleanup());

describe('NotebookService + NoteService', () => {
  it('init creates the default notebook', async () => {
    expect((await ctx.notebooks.list()).map((n) => n.key)).toEqual([DEFAULT_NOTEBOOK_KEY]);
  });

  it('allocates sequential ids per notebook', async () => {
    await ctx.notebooks.create({ key: 'WORK', name: 'Work' });
    const a = await ctx.notes.create({ title: 'A', notebook: 'WORK' });
    const b = await ctx.notes.create({ title: 'B', notebook: 'WORK' });
    expect([a.id, b.id]).toEqual(['WORK-1', 'WORK-2']);
  });

  it('rejects notes for unknown notebooks', async () => {
    await expect(ctx.notes.create({ title: 'x', notebook: 'NOPE' })).rejects.toThrow();
  });

  it('update bumps `updated` and persists the patch', async () => {
    const n = await ctx.notes.create({ title: 'A', notebook: DEFAULT_NOTEBOOK_KEY });
    const updated = await ctx.notes.update(n.id, { body: 'new body', labels: ['x'] });
    expect(updated.body).toBe('new body');
    expect(updated.labels).toEqual(['x']);
    expect(Date.parse(updated.updated)).toBeGreaterThanOrEqual(Date.parse(n.updated));
    const reloaded = await ctx.notes.get(n.id);
    expect(reloaded.body).toBe('new body');
  });

  it('changeNotebook mints a new id and the old one no longer resolves', async () => {
    await ctx.notebooks.create({ key: 'WORK', name: 'Work' });
    const n = await ctx.notes.create({ title: 'A', notebook: DEFAULT_NOTEBOOK_KEY });
    const moved = await ctx.notes.changeNotebook(n.id, 'WORK');
    expect(moved.id.startsWith('WORK-')).toBe(true);
    await expect(ctx.notes.get(n.id)).rejects.toThrow();
  });

  it('delete is soft: the note moves to the recycle bin and can be restored', async () => {
    const n = await ctx.notes.create({ title: 'A', notebook: DEFAULT_NOTEBOOK_KEY });
    await ctx.notes.delete(n.id);
    await expect(ctx.notes.get(n.id)).rejects.toThrow();

    const binned = await ctx.noteRecycleBin.list();
    expect(binned.map((x) => x.id)).toEqual([n.id]);
    expect(binned[0].deletedAt).toBeTruthy();

    const restored = await ctx.noteRecycleBin.restore(n.id);
    expect(restored.deletedAt).toBeNull();
    expect((await ctx.notes.get(n.id)).title).toBe('A');
    expect(await ctx.noteRecycleBin.list()).toHaveLength(0);
  });

  it('cannot delete the default notebook', async () => {
    await expect(ctx.notebooks.delete(DEFAULT_NOTEBOOK_KEY)).rejects.toThrow();
  });

  it('deleting a notebook is permanent and takes its notes with it (no recycle bin)', async () => {
    await ctx.notebooks.create({ key: 'WORK', name: 'Work' });
    const n = await ctx.notes.create({ title: 'A', notebook: 'WORK' });
    await ctx.notebooks.delete('WORK');

    await expect(ctx.notes.get(n.id)).rejects.toThrow();
    expect(await ctx.noteRecycleBin.list()).toHaveLength(0);
    expect((await ctx.notebooks.list()).map((x) => x.key)).not.toContain('WORK');
  });
});

describe('recycle-bin scoping', () => {
  it('emptying the note bin leaves the ticket bin intact, and vice-versa', async () => {
    await ctx.projects.create({ key: 'PTAH', name: 'Ptah' });
    const ticket = await ctx.tickets.create({ title: 'T', project: 'PTAH' });
    const note = await ctx.notes.create({ title: 'N', notebook: DEFAULT_NOTEBOOK_KEY });
    await ctx.tickets.delete(ticket.id);
    await ctx.notes.delete(note.id);

    await ctx.noteRecycleBin.empty();
    expect(await ctx.noteRecycleBin.list()).toHaveLength(0);
    expect((await ctx.recycleBin.list()).map((t) => t.id)).toEqual([ticket.id]);

    // Re-bin a note, then empty the ticket bin — the note bin must survive.
    const note2 = await ctx.notes.create({ title: 'N2', notebook: DEFAULT_NOTEBOOK_KEY });
    await ctx.notes.delete(note2.id);
    await ctx.recycleBin.empty();
    expect(await ctx.recycleBin.list()).toHaveLength(0);
    expect((await ctx.noteRecycleBin.list()).map((n) => n.id)).toEqual([note2.id]);
  });
});

describe('NoteImportExportService', () => {
  let work: string;
  beforeEach(async () => {
    work = await fs.mkdtemp(path.join(os.tmpdir(), 'ptah-note-io-'));
    await ctx.notebooks.create({ key: 'SRC', name: 'Source' });
    await ctx.notebooks.create({ key: 'DST', name: 'Dest' });
  });
  afterEach(() => fs.rm(work, { recursive: true, force: true }));

  it('round-trips a single note through a .md file with a fresh id', async () => {
    const src = await ctx.notes.create({
      title: 'Plain',
      notebook: 'SRC',
      labels: ['b', 'a'],
      body: 'body text',
    });
    const dest = path.join(work, 'note.md');
    await ctx.noteImportExport.exportNotes([src.id], dest);

    const [imported] = await ctx.noteImportExport.importFromFiles([dest], 'DST');
    expect(imported.id).not.toBe(src.id);
    expect(imported.id.startsWith('DST-')).toBe(true);
    expect(imported.notebook).toBe('DST');
    expect(imported.title).toBe('Plain');
    expect(imported.body).toBe('body text');
    expect(imported.labels).toEqual(['a', 'b']);
  });

  it('exports a whole notebook as a .zip and imports every note', async () => {
    await ctx.notes.create({ title: 'One', notebook: 'SRC' });
    await ctx.notes.create({ title: 'Two', notebook: 'SRC' });
    const dest = path.join(work, 'notebook.zip');
    await ctx.noteImportExport.exportNotebook('SRC', dest);

    const imported = await ctx.noteImportExport.importFromFiles([dest], 'DST');
    expect(imported.map((n) => n.title).sort()).toEqual(['One', 'Two']);
    expect(imported.every((n) => n.notebook === 'DST')).toBe(true);
  });

  it('a single-note .md export rejects a notebook with more than one note', async () => {
    await ctx.notes.create({ title: 'One', notebook: 'SRC' });
    await ctx.notes.create({ title: 'Two', notebook: 'SRC' });
    await expect(
      ctx.noteImportExport.exportNotebook('SRC', path.join(work, 'x.md')),
    ).rejects.toThrow();
  });
});
