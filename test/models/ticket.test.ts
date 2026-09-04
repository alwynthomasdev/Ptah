import { describe, expect, it } from 'vitest';
import { applyPatch, createTicket, normalizeLabels, normalizeUrls } from '@models/Ticket';

describe('createTicket', () => {
  it('applies defaults', () => {
    const t = createTicket('PTAH-1', { title: '  Do the thing  ', project: 'PTAH' });
    expect(t.title).toBe('Do the thing');
    expect(t.status).toBe('backlog');
    expect(t.priority).toBe('medium');
    expect(t.due).toBeNull();
    expect(t.labels).toEqual([]);
    expect(t.urls).toEqual([]);
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
