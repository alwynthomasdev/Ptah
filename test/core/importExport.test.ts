import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Ticket } from '@models/Ticket';
import { AppContext } from '@core/AppContext';
import { makeTmpDir } from '../helpers/tmp';

let ctx: AppContext;
let cleanup: () => Promise<void>;
let work: string;

beforeEach(async () => {
  const t = await makeTmpDir();
  cleanup = t.cleanup;
  ctx = new AppContext(t.dir);
  await ctx.init();
  await ctx.projects.create({ key: 'SRC', name: 'Source' });
  await ctx.projects.create({ key: 'DST', name: 'Dest' });
  work = await fs.mkdtemp(path.join(os.tmpdir(), 'ptah-io-'));
});
afterEach(async () => {
  await cleanup();
  await fs.rm(work, { recursive: true, force: true });
});

/** The fields a round-trip must preserve (id/created/project are expected to change). */
function contentOf(t: Ticket) {
  return {
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    labels: t.labels,
    due: t.due,
    attachments: t.attachments,
  };
}

describe('ImportExportService', () => {
  it('round-trips a plain ticket through a .md file', async () => {
    const src = await ctx.tickets.create({
      title: 'Plain',
      project: 'SRC',
      priority: 'high',
      labels: ['a', 'b'],
      description: '# Hi\n\nbody',
    });
    const dest = path.join(work, 'out.md');

    await ctx.importExport.exportTickets([src.id], dest, { media: false });
    expect((await fs.readFile(dest, 'utf8')).startsWith('---')).toBe(true);

    const [imported] = await ctx.importExport.importFromFiles([dest], 'DST');
    expect(imported.id).toBe('DST-1');
    expect(imported.project).toBe('DST');
    expect(contentOf(imported)).toEqual(contentOf(src));
  });

  it('round-trips attachments through a .zip', async () => {
    const src = await ctx.tickets.create({ title: 'WithFiles', project: 'SRC' });
    const a = path.join(work, 'chart.png');
    const b = path.join(work, 'spec.txt');
    await fs.writeFile(a, 'PNGBYTES');
    await fs.writeFile(b, 'plain text');
    await ctx.tickets.addAttachment(src.id, a);
    await ctx.tickets.addAttachment(src.id, b);
    const reloaded = await ctx.tickets.get(src.id);

    const dest = path.join(work, 'out.zip');
    await ctx.importExport.exportTickets([src.id], dest, { media: true });

    const [imported] = await ctx.importExport.importFromFiles([dest], 'DST');
    expect(imported.attachments).toEqual(['chart.png', 'spec.txt']);
    expect(contentOf(imported)).toEqual(contentOf(reloaded));

    const copied = await fs.readFile(
      path.join(ctx.store.attachmentsDir('DST', imported.id), 'chart.png'),
    );
    expect(copied.toString()).toBe('PNGBYTES');
  });

  it('exports a whole project and re-imports it into another project', async () => {
    await ctx.tickets.create({ title: 'One', project: 'SRC' });
    await ctx.tickets.create({ title: 'Two', project: 'SRC' });
    await ctx.tickets.create({ title: 'Three', project: 'SRC' });
    const dest = path.join(work, 'project.zip');

    await ctx.importExport.exportProject('SRC', dest, { media: false });
    const imported = await ctx.importExport.importFromFiles([dest], 'DST');

    expect(imported).toHaveLength(3);
    expect(imported.every((t) => t.project === 'DST')).toBe(true);
    expect((await ctx.tickets.list('DST')).map((t) => t.title).sort()).toEqual([
      'One',
      'Three',
      'Two',
    ]);
  });

  it('imports a hand-written .md with missing fields using safe defaults', async () => {
    const dest = path.join(work, 'sparse.md');
    await fs.writeFile(dest, '---\ntitle: Sparse\n---\n\nJust a body.\n');

    const [imported] = await ctx.importExport.importFromFiles([dest], 'DST');
    expect(imported.title).toBe('Sparse');
    expect(imported.status).toBe('backlog');
    expect(imported.priority).toBe('medium');
    expect(imported.description).toBe('Just a body.');
  });
});
