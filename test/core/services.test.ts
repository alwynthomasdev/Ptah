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

describe('TicketService.changeProject', () => {
  beforeEach(async () => {
    await ctx.projects.create({ key: 'PTAH', name: 'Ptah' });
    await ctx.projects.create({ key: 'ACME', name: 'Acme' });
  });

  it('mints a new id in the target project and the old id no longer resolves', async () => {
    const t = await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    const moved = await ctx.tickets.changeProject(t.id, 'ACME');

    expect(moved.id.startsWith('ACME-')).toBe(true);
    expect(moved.id).not.toBe(t.id);
    expect(moved.project).toBe('ACME');

    await expect(ctx.tickets.get(t.id)).rejects.toThrow();
    expect((await ctx.tickets.get(moved.id)).id).toBe(moved.id);
  });

  it('rejects a move into a nonexistent project, leaving the ticket unchanged', async () => {
    const t = await ctx.tickets.create({ title: 'A', project: 'PTAH' });

    await expect(ctx.tickets.changeProject(t.id, 'NOPE')).rejects.toThrow();

    const reloaded = await ctx.tickets.get(t.id);
    expect(reloaded.id).toBe(t.id);
    expect(reloaded.project).toBe('PTAH');
  });

  it('is a no-op when moving to the same project', async () => {
    const t = await ctx.tickets.create({ title: 'A', project: 'PTAH' });
    const result = await ctx.tickets.changeProject(t.id, 'PTAH');

    expect(result.id).toBe(t.id);
    expect(result.project).toBe('PTAH');
    expect((await ctx.tickets.get(t.id)).id).toBe(t.id);
  });

  it('re-links cross-project sub-tasks to the epic’s new id', async () => {
    const epic = await ctx.tickets.create({ title: 'Epic', project: 'PTAH', type: 'epic' });
    const child = await ctx.tickets.create({ title: 'Child', project: 'ACME', parent: epic.id });

    const moved = await ctx.tickets.changeProject(epic.id, 'ACME');

    expect((await ctx.tickets.get(child.id)).parent).toBe(moved.id); // child re-pointed
    expect(await ctx.tickets.listChildren(epic.id)).toHaveLength(0); // old id has none
  });

  it('a moved sub-task keeps its (cross-project) parent link', async () => {
    const epic = await ctx.tickets.create({ title: 'Epic', project: 'PTAH', type: 'epic' });
    const child = await ctx.tickets.create({ title: 'Child', project: 'PTAH', parent: epic.id });

    const moved = await ctx.tickets.changeProject(child.id, 'ACME');
    expect(moved.parent).toBe(epic.id);
    expect((await ctx.tickets.listChildren(epic.id)).map((c) => c.id)).toEqual([moved.id]);
  });
});

describe('epic / parent hierarchy', () => {
  beforeEach(async () => {
    await ctx.projects.create({ key: 'PTAH', name: 'Ptah' });
    await ctx.projects.create({ key: 'ACME', name: 'Acme' });
  });

  it('links a sub-task to an epic in another project and lists it', async () => {
    const epic = await ctx.tickets.create({ title: 'Epic', project: 'PTAH', type: 'epic' });
    const child = await ctx.tickets.create({ title: 'Child', project: 'ACME', parent: epic.id });

    expect(child.parent).toBe(epic.id);
    expect((await ctx.tickets.listChildren(epic.id)).map((c) => c.id)).toEqual([child.id]);
  });

  it('rejects a parent that does not exist', async () => {
    await expect(
      ctx.tickets.create({ title: 'x', project: 'PTAH', parent: 'PTAH-999' }),
    ).rejects.toThrow(/does not exist/i);
  });

  it('rejects a self-parent on update', async () => {
    const t = await ctx.tickets.create({ title: 'x', project: 'PTAH' });
    await expect(ctx.tickets.update(t.id, { parent: t.id })).rejects.toThrow(/its own parent/i);
  });

  it('rejects nesting three levels deep', async () => {
    const epic = await ctx.tickets.create({ title: 'Epic', project: 'PTAH', type: 'epic' });
    const mid = await ctx.tickets.create({ title: 'Mid', project: 'PTAH', parent: epic.id });
    const leaf = await ctx.tickets.create({ title: 'Leaf', project: 'PTAH' });

    await expect(ctx.tickets.update(leaf.id, { parent: mid.id })).rejects.toThrow(/two levels/i);
  });

  it('refuses to give a parent to a ticket that already has sub-tasks', async () => {
    const parent = await ctx.tickets.create({ title: 'P', project: 'PTAH' });
    await ctx.tickets.create({ title: 'C', project: 'PTAH', parent: parent.id });
    const other = await ctx.tickets.create({ title: 'O', project: 'PTAH', type: 'epic' });

    await expect(ctx.tickets.update(parent.id, { parent: other.id })).rejects.toThrow(
      /sub-tasks of its own/i,
    );
  });

  it('orphans sub-tasks when the epic is soft-deleted; restore does not re-attach', async () => {
    const epic = await ctx.tickets.create({ title: 'Epic', project: 'PTAH', type: 'epic' });
    const child = await ctx.tickets.create({ title: 'Child', project: 'ACME', parent: epic.id });

    await ctx.tickets.delete(epic.id);
    expect((await ctx.tickets.get(child.id)).parent).toBeNull();

    await ctx.recycleBin.restore(epic.id);
    expect((await ctx.tickets.get(child.id)).parent).toBeNull();
  });

  it('drops a dangling parent link on restore when the parent was purged', async () => {
    const epic = await ctx.tickets.create({ title: 'Epic', project: 'PTAH', type: 'epic' });
    const child = await ctx.tickets.create({ title: 'Child', project: 'PTAH', parent: epic.id });

    await ctx.tickets.delete(child.id);
    await ctx.tickets.delete(epic.id);
    await ctx.recycleBin.purge(epic.id);

    const restored = await ctx.recycleBin.restore(child.id);
    expect(restored.parent).toBeNull();
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

  it('seeds the TODO project with a custom name when init() is given one', async () => {
    const t = await makeTmpDir();
    const fresh = new AppContext(t.dir);
    await fresh.init('My Tasks');

    const project = await fresh.projects.get(DEFAULT_PROJECT_KEY);
    expect(project.key).toBe(DEFAULT_PROJECT_KEY);
    expect(project.name).toBe('My Tasks');

    await t.cleanup();
  });

  it('defaults the seeded name to "To Do" when init() is called with no argument', async () => {
    const t = await makeTmpDir();
    const fresh = new AppContext(t.dir);
    await fresh.init();

    const project = await fresh.projects.get(DEFAULT_PROJECT_KEY);
    expect(project.name).toBe('To Do');

    await t.cleanup();
  });

  it('refuses to delete the default project', async () => {
    await expect(ctx.projects.delete(DEFAULT_PROJECT_KEY)).rejects.toThrow();
    // ProjectService has no `exists`; a successful `get` after the rejected
    // delete confirms the project is still there.
    expect((await ctx.projects.get(DEFAULT_PROJECT_KEY)).key).toBe(DEFAULT_PROJECT_KEY);
  });
});
