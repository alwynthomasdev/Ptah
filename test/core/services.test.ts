import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppContext } from '@core/AppContext';
import { DEFAULT_PROJECT_KEY } from '@models/Project';
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

describe('ProjectService + TicketService', () => {
  it('allocates sequential ids per project', async () => {
    await ctx.projects.create({ key: 'PTAH', name: 'Ptah' });
    const a = await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    const b = await ctx.tickets.create({ title: 'B', project: 'PTAH' });
    expect([a.id, b.id]).toEqual(['PTAH-1', 'PTAH-2']);
  });

  it('rejects tickets for unknown projects', async () => {
    await expect(ctx.tickets.create({ title: 'x', project: 'NOPE' })).rejects.toThrow();
  });

  it('update applies a patch and persists it', async () => {
    await ctx.projects.create({ key: 'PTAH', name: 'Ptah' });
    const t = await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    await ctx.tickets.update(t.id, { status: 'wip', priority: 'high' });
    const reloaded = await ctx.tickets.get(t.id);
    expect(reloaded.status).toBe('wip');
    expect(reloaded.priority).toBe('high');
  });

  it('list without a project key spans all projects', async () => {
    await ctx.projects.create({ key: 'PTAH', name: 'Ptah' });
    await ctx.projects.create({ key: 'ACME', name: 'Acme' });
    await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    await ctx.tickets.create({ title: 'B', project: 'ACME' });
    expect((await ctx.tickets.list()).length).toBe(2);
  });
});

describe('recycle bin flow', () => {
  beforeEach(async () => {
    await ctx.projects.create({ key: 'PTAH', name: 'Ptah' });
  });

  it('delete moves to the bin; restore brings it back', async () => {
    const t = await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    await ctx.tickets.delete(t.id);

    expect(await ctx.tickets.list('PTAH')).toHaveLength(0);
    const binned = await ctx.recycleBin.list();
    expect(binned.map((x) => x.id)).toEqual([t.id]);
    expect(binned[0].deletedAt).toBeTruthy();

    await ctx.recycleBin.restore(t.id);
    expect((await ctx.tickets.list('PTAH')).map((x) => x.id)).toEqual([t.id]);
    expect(await ctx.recycleBin.list()).toHaveLength(0);
  });

  it('purge deletes permanently', async () => {
    const t = await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    await ctx.tickets.delete(t.id);
    await ctx.recycleBin.purge(t.id);
    expect(await ctx.recycleBin.list()).toHaveLength(0);
  });

  it('cannot restore into a deleted project', async () => {
    const t = await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    await ctx.tickets.delete(t.id);
    await ctx.projects.delete('PTAH');
    await expect(ctx.recycleBin.restore(t.id)).rejects.toThrow();
  });

  it('deleting a project is permanent and never touches the recycle bin', async () => {
    await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    await ctx.tickets.create({ title: 'B', project: 'PTAH' });

    await ctx.projects.delete('PTAH');

    expect(await ctx.store.exists(ctx.store.projectDir('PTAH'))).toBe(false);
    // The always-present TODO project (seeded by AppContext.init) remains.
    expect(await ctx.projects.list()).toHaveLength(1);
    expect(await ctx.recycleBin.list()).toHaveLength(0);
  });
});

describe('default project seeding', () => {
  it('creates the TODO project on a fresh data dir', async () => {
    const project = await ctx.projects.get(DEFAULT_PROJECT_KEY);
    expect(project.key).toBe(DEFAULT_PROJECT_KEY);
  });

  it('a second init() does not clobber an existing TODO project', async () => {
    const ticket = await ctx.tickets.create({ title: 'A', project: DEFAULT_PROJECT_KEY });
    await ctx.projects.rename(DEFAULT_PROJECT_KEY, 'Renamed');

    await ctx.init();

    const project = await ctx.projects.get(DEFAULT_PROJECT_KEY);
    expect(project.name).toBe('Renamed');
    expect((await ctx.tickets.get(ticket.id)).id).toBe(ticket.id);
  });

  it('the ticket counter survives a second init()', async () => {
    await ctx.tickets.create({ title: 'A', project: DEFAULT_PROJECT_KEY });
    await ctx.tickets.create({ title: 'B', project: DEFAULT_PROJECT_KEY });

    await ctx.init();

    expect((await ctx.projects.get(DEFAULT_PROJECT_KEY)).counter).toBe(2);
  });
});
