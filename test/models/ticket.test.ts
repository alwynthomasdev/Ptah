import { describe, expect, it } from 'vitest';
import { applyPatch, createTicket, normalizeLabels, normalizeUrls } from '@models/Ticket';

describe('createTicket', () => {
  it('applies defaults', () => {
    const t = createTicket('PTAH-1', { title: '  Do the thing  ', project: 'PTAH' });
    expect(t.title).toBe('Do the thing');
    expect(t.type).toBe('task');
    expect(t.parent).toBeNull();
    expect(t.status).toBe('backlog');
    expect(t.priority).toBe('medium');
    expect(t.due).toBeNull();
    expect(t.labels).toEqual([]);
    expect(t.urls).toEqual([]);
  });

  it('accepts type and a parent id', () => {
    const t = createTicket('PTAH-2', {
      title: 'x',
      project: 'PTAH',
      type: 'epic',
      parent: 'ACME-4',
    });
    expect(t.type).toBe('epic');
    expect(t.parent).toBe('ACME-4');
  });

  it('rejects a malformed parent id, a self-parent, and a bad type', () => {
    expect(() =>
      createTicket('PTAH-1', { title: 'x', project: 'PTAH', parent: 'not-an-id' }),
    ).toThrow();
    expect(() =>
      createTicket('PTAH-1', { title: 'x', project: 'PTAH', parent: 'PTAH-1' }),
    ).toThrow(/its own parent/i);
    expect(() =>
      // @ts-expect-error deliberate bad type
      createTicket('PTAH-1', { title: 'x', project: 'PTAH', type: 'story' }),
    ).toThrow();
  });

  it('normalizes urls supplied on input', () => {
    const t = createTicket('PTAH-1', {
      title: 'x',
      project: 'PTAH',
      urls: [' https://a.com ', 'https://a.com', 'https://b.com', '', '  '],
    });
    expect(t.urls).toEqual(['https://a.com', 'https://b.com']);
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

  it('updates urls', () => {
    const next = applyPatch(base, { urls: ['https://a.com', 'https://b.com'] });
    expect(next.urls).toEqual(['https://a.com', 'https://b.com']);
    expect(base.urls).toEqual([]); // original untouched
  });

  it('sets, keeps, and clears the parent (three-state)', () => {
    const linked = applyPatch(base, { parent: 'PTAH-9' });
    expect(linked.parent).toBe('PTAH-9');
    expect(applyPatch(linked, { status: 'wip' }).parent).toBe('PTAH-9'); // absent = keep
    expect(applyPatch(linked, { parent: null }).parent).toBeNull(); // null = clear
    expect(base.parent).toBeNull(); // original untouched
  });

  it('changes type and rejects a bad one', () => {
    expect(applyPatch(base, { type: 'epic' }).type).toBe('epic');
    // @ts-expect-error deliberate bad type
    expect(() => applyPatch(base, { type: 'bug' })).toThrow();
  });

  it('rejects a self-parent patch', () => {
    expect(() => applyPatch(base, { parent: base.id })).toThrow(/its own parent/i);
  });
});

describe('normalizeLabels', () => {
  it('trims, dedupes case-insensitively, and sorts', () => {
    expect(normalizeLabels([' bug', 'UI', 'bug', 'ui ', ''])).toEqual(['bug', 'UI']);
  });
});

describe('normalizeUrls', () => {
  it('trims, dedupes case-sensitively, and drops empties', () => {
    expect(normalizeUrls([' https://a.com ', 'https://a.com', 'https://b.com', '', '  '])).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('preserves input order instead of sorting (unlike normalizeLabels)', () => {
    expect(normalizeUrls(['https://z.com', 'https://a.com'])).toEqual([
      'https://z.com',
      'https://a.com',
    ]);
  });
});
