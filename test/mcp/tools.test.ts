import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppContext } from '@core/AppContext';
import {
  createTicket,
  deleteTicket,
  getTicket,
  listProjects,
  listTickets,
  updateTicket,
} from '../../src/mcp/server/tools';
import { makeTmpDir } from '../helpers/tmp';

let ctx: AppContext;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const t = await makeTmpDir('ptah-mcp-tools-');
  cleanup = t.cleanup;
  ctx = new AppContext(t.dir);
  await ctx.init();
  await ctx.projects.create({ key: 'PTAH', name: 'Ptah' });
  await ctx.projects.create({ key: 'ACME', name: 'Acme' });
});
afterEach(() => cleanup());

describe('listTickets / getTicket', () => {
  it('listTickets returns a trimmed summary, getTicket returns the full record', async () => {
    const created = await createTicket(ctx, {
      title: 'Write docs',
      project: 'PTAH',
      labels: ['b', 'a'],
      urls: ['https://example.com'],
      description: 'body text',
    });

    const summaries = await listTickets(ctx, {});
    expect(summaries).toEqual([
      {
        id: created.id,
        title: 'Write docs',
        project: 'PTAH',
        status: 'backlog',
        priority: 'medium',
        due: null,
        labels: ['a', 'b'],
      },
    ]);
    // Trimmed shape must not leak full-record fields.
    expect(summaries[0]).not.toHaveProperty('description');
    expect(summaries[0]).not.toHaveProperty('urls');
    expect(summaries[0]).not.toHaveProperty('attachments');

    const full = await getTicket(ctx, { id: created.id });
    expect(full).toMatchObject({
      id: created.id,
      title: 'Write docs',
      description: 'body text',
      urls: ['https://example.com'],
      attachments: [],
    });
  });

  it('scopes by projectKey when given, spans all projects when omitted', async () => {
    await createTicket(ctx, { title: 'A', project: 'PTAH' });
    await createTicket(ctx, { title: 'B', project: 'ACME' });

    const scoped = await listTickets(ctx, { projectKey: 'PTAH' });
    expect(scoped.map((t) => t.title)).toEqual(['A']);

    const unscoped = await listTickets(ctx, {});
    expect(unscoped.map((t) => t.title).sort()).toEqual(['A', 'B']);
  });
});

describe('createTicket', () => {
  it('throws a surfaced error when the project does not exist', async () => {
    await expect(createTicket(ctx, { title: 'x', project: 'NOPE' })).rejects.toThrow(
      /project "NOPE" does not exist/i,
    );
  });
});

describe('updateTicket', () => {
  it('applies a patch, leaving unset fields unchanged', async () => {
    const created = await createTicket(ctx, { title: 'A', project: 'PTAH', due: '2026-01-01' });
    const updated = await updateTicket(ctx, { id: created.id, status: 'wip' });
    expect(updated.status).toBe('wip');
    expect(updated.title).toBe('A');
    expect(updated.due).toBe('2026-01-01');
  });

  it('due: null clears an existing due date', async () => {
    const created = await createTicket(ctx, { title: 'A', project: 'PTAH', due: '2026-01-01' });
    const updated = await updateTicket(ctx, { id: created.id, due: null });
    expect(updated.due).toBeNull();
  });

  it('omitting due leaves an existing due date unchanged', async () => {
    const created = await createTicket(ctx, { title: 'A', project: 'PTAH', due: '2026-01-01' });
    const updated = await updateTicket(ctx, { id: created.id, title: 'A renamed' });
    expect(updated.due).toBe('2026-01-01');
  });
});

describe('deleteTicket', () => {
  it('soft-deletes: absent from listTickets afterward, call itself succeeds', async () => {
    const created = await createTicket(ctx, { title: 'A', project: 'PTAH' });
    const result = await deleteTicket(ctx, { id: created.id });
    expect(result).toEqual({ id: created.id });

    const remaining = await listTickets(ctx, {});
    expect(remaining.map((t) => t.id)).not.toContain(created.id);

    const binned = await ctx.recycleBin.list();
    expect(binned.map((t) => t.id)).toContain(created.id);
  });
});

describe('listProjects', () => {
  it('reflects created projects', async () => {
    // `AppContext.init()` always ensures the default TODO project exists.
    const projects = await listProjects(ctx);
    expect(projects.map((p) => p.key).sort()).toEqual(['ACME', 'PTAH', 'TODO']);
  });
});
