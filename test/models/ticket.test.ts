import { describe, expect, it } from 'vitest';
import { applyPatch, createTicket, normalizeLabels } from '@models/Ticket';

describe('createTicket', () => {
  it('applies defaults', () => {
    const t = createTicket('PTAH-1', { title: '  Do the thing  ', project: 'PTAH' });
    expect(t.title).toBe('Do the thing');
    expect(t.status).toBe('backlog');
    expect(t.priority).toBe('medium');
    expect(t.due).toBeNull();
    expect(t.labels).toEqual([]);
  });

  it('rejects empty titles and bad enums', () => {
    expect(() => createTicket('PTAH-1', { title: '  ', project: 'PTAH' })).toThrow();
    expect(() =>
      // @ts-expect-error deliberate bad status
      createTicket('PTAH-1', { title: 'x', project: 'PTAH', status: 'nope' }),
    ).toThrow();
  });
});

describe('applyPatch', () => {
  const base = createTicket('PTAH-1', { title: 'x', project: 'PTAH' });

  it('updates only provided fields', () => {
    const next = applyPatch(base, { status: 'wip', priority: 'high' });
    expect(next.status).toBe('wip');
    expect(next.priority).toBe('high');
    expect(next.title).toBe('x');
    expect(base.status).toBe('backlog'); // original untouched
  });

  it('clears due date when set to null', () => {
    const withDue = applyPatch(base, { due: '2026-09-01T00:00:00.000Z' });
    expect(applyPatch(withDue, { due: null }).due).toBeNull();
  });
});

describe('normalizeLabels', () => {
  it('trims, dedupes case-insensitively, and sorts', () => {
    expect(normalizeLabels([' bug', 'UI', 'bug', 'ui ', ''])).toEqual(['bug', 'UI']);
  });
});
