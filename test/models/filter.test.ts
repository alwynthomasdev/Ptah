import { describe, expect, it } from 'vitest';
import type { Ticket } from '@models/Ticket';
import { createTicket } from '@models/Ticket';
import { filterAndSort, matchesFilter, sortTickets } from '@models/Filter';

function tkt(over: Partial<Ticket>): Ticket {
  return { ...createTicket(over.id ?? 'PTAH-1', { title: 'x', project: 'PTAH' }), ...over };
}

const tickets: Ticket[] = [
  tkt({
    id: 'PTAH-1',
    title: 'Fix login bug',
    priority: 'high',
    labels: ['bug'],
    created: '2026-01-01T00:00:00Z',
    due: '2026-02-01T00:00:00Z',
  }),
  tkt({
    id: 'PTAH-2',
    title: 'Write docs',
    priority: 'low',
    labels: ['docs'],
    created: '2026-03-01T00:00:00Z',
    due: null,
  }),
  tkt({
    id: 'ACME-3',
    title: 'Bug triage',
    project: 'ACME',
    priority: 'highest',
    labels: ['bug', 'ops'],
    created: '2026-02-01T00:00:00Z',
    due: '2026-01-15T00:00:00Z',
  }),
];

describe('matchesFilter', () => {
  it('an empty filter matches everything', () => {
    expect(tickets.every((t) => matchesFilter(t, {}))).toBe(true);
  });

  it('text match is case-insensitive substring on title', () => {
    expect(tickets.filter((t) => matchesFilter(t, { text: 'bug' })).map((t) => t.id)).toEqual([
      'PTAH-1',
      'ACME-3',
    ]);
  });

  it('text is trimmed before matching', () => {
    expect(
      tickets.filter((t) => matchesFilter(t, { text: '  LOGIN  ' })).map((t) => t.id),
    ).toEqual(['PTAH-1']);
  });

  it('labels require all listed', () => {
    expect(
      tickets.filter((t) => matchesFilter(t, { labels: ['bug', 'ops'] })).map((t) => t.id),
    ).toEqual(['ACME-3']);
  });

  it('label matching is case-insensitive', () => {
    expect(
      tickets.filter((t) => matchesFilter(t, { labels: ['BuG'] })).map((t) => t.id),
    ).toEqual(['PTAH-1', 'ACME-3']);
  });

  it('projects and priorities restrict', () => {
    expect(
      tickets.filter((t) => matchesFilter(t, { projects: ['ACME'] })).map((t) => t.id),
    ).toEqual(['ACME-3']);
    expect(
      tickets.filter((t) => matchesFilter(t, { priorities: ['low', 'high'] })).map((t) => t.id),
    ).toEqual(['PTAH-1', 'PTAH-2']);
  });

  it('all fields are ANDed together', () => {
    expect(
      tickets
        .filter((t) => matchesFilter(t, { labels: ['bug'], priorities: ['highest'], projects: ['ACME'] }))
        .map((t) => t.id),
    ).toEqual(['ACME-3']);
    // Same filter but an incompatible project → nothing.
    expect(
      tickets.filter((t) =>
        matchesFilter(t, { labels: ['bug'], priorities: ['highest'], projects: ['PTAH'] }),
      ),
    ).toEqual([]);
  });

  it('an empty array field is not a constraint', () => {
    expect(tickets.every((t) => matchesFilter(t, { labels: [], priorities: [], projects: [] }))).toBe(
      true,
    );
  });
});

describe('sortTickets', () => {
  it('sorts by priority desc', () => {
    expect(sortTickets(tickets, { key: 'priority', dir: 'desc' }).map((t) => t.id)).toEqual([
      'ACME-3',
      'PTAH-1',
      'PTAH-2',
    ]);
  });

  it('sorts by created asc', () => {
    expect(sortTickets(tickets, { key: 'created', dir: 'asc' }).map((t) => t.id)).toEqual([
      'PTAH-1',
      'ACME-3',
      'PTAH-2',
    ]);
  });

  it('sorts by priority asc', () => {
    expect(sortTickets(tickets, { key: 'priority', dir: 'asc' }).map((t) => t.id)).toEqual([
      'PTAH-2',
      'PTAH-1',
      'ACME-3',
    ]);
  });

  it('missing due dates sort last regardless of direction', () => {
    expect(sortTickets(tickets, { key: 'due', dir: 'asc' }).map((t) => t.id)).toEqual([
      'ACME-3',
      'PTAH-1',
      'PTAH-2',
    ]);
    expect(sortTickets(tickets, { key: 'due', dir: 'desc' }).map((t) => t.id)).toEqual([
      'PTAH-1',
      'ACME-3',
      'PTAH-2',
    ]);
  });

  it('breaks ties by numeric-aware id order', () => {
    const same = [
      tkt({ id: 'PTAH-10', priority: 'medium' }),
      tkt({ id: 'PTAH-2', priority: 'medium' }),
      tkt({ id: 'PTAH-1', priority: 'medium' }),
    ];
    expect(sortTickets(same, { key: 'priority', dir: 'desc' }).map((t) => t.id)).toEqual([
      'PTAH-1',
      'PTAH-2',
      'PTAH-10',
    ]);
  });

  it('returns a new array and does not mutate the input', () => {
    const input = [...tickets];
    const out = sortTickets(input, { key: 'priority', dir: 'asc' });
    expect(out).not.toBe(input);
    expect(input.map((t) => t.id)).toEqual(['PTAH-1', 'PTAH-2', 'ACME-3']);
  });

  it('treats an unparseable created date as 0', () => {
    const items = [
      tkt({ id: 'PTAH-9', created: 'not-a-date' }),
      tkt({ id: 'PTAH-8', created: '2026-01-01T00:00:00Z' }),
    ];
    expect(sortTickets(items, { key: 'created', dir: 'asc' })[0].id).toBe('PTAH-9');
  });
});

describe('filterAndSort', () => {
  it('composes filtering then sorting', () => {
    const out = filterAndSort(tickets, { labels: ['bug'] }, { key: 'priority', dir: 'asc' });
    expect(out.map((t) => t.id)).toEqual(['PTAH-1', 'ACME-3']);
  });
});
