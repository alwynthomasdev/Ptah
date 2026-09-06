// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { Ticket } from '@models/Ticket';
import type { Note } from '@models/Note';

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'TODO-1',
    project: 'TODO',
    title: 'A',
    type: 'task',
    parent: null,
    status: 'backlog',
    priority: 'medium',
    due: null,
    labels: [],
    urls: [],
    description: '',
    attachments: [],
    created: new Date().toISOString(),
    ...overrides,
  } as Ticket;
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'NB-1',
    notebook: 'NB',
    title: 'A',
    labels: [],
    body: '',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

const ptahMock = {
  tickets: { list: vi.fn(async () => ({ ok: true as const, value: [] as Ticket[] })) },
  notes: { list: vi.fn(async () => ({ ok: true as const, value: [] as Note[] })) },
};
window.ptah = ptahMock as unknown as typeof window.ptah;

const { useSearchStore } = await import('@renderer/stores/search');
const { useTicketsStore } = await import('@renderer/stores/tickets');
const { useNotesStore } = await import('@renderer/stores/notes');

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('search store', () => {
  it('returns nothing until there is a query or a label facet', () => {
    const search = useSearchStore();
    useTicketsStore().items = [makeTicket({ title: 'buy milk' })];
    useNotesStore().items = [makeNote({ title: 'buy milk' })];

    expect(search.hasQuery).toBe(false);
    expect(search.ticketResults).toEqual([]);
    expect(search.noteResults).toEqual([]);

    search.setQuery('milk');
    expect(search.hasQuery).toBe(true);
    expect(search.ticketResults.map((t) => t.id)).toEqual(['TODO-1']);
    expect(search.noteResults.map((n) => n.id)).toEqual(['NB-1']);
    expect(search.totalCount).toBe(2);
  });

  it('a shared label facet filters both tickets and notes', () => {
    const search = useSearchStore();
    useTicketsStore().items = [
      makeTicket({ id: 'A-1', title: 'x', labels: ['home'] }),
      makeTicket({ id: 'A-2', title: 'x', labels: [] }),
    ];
    useNotesStore().items = [
      makeNote({ id: 'N-1', title: 'x', labels: ['home'] }),
      makeNote({ id: 'N-2', title: 'x', labels: ['work'] }),
    ];
    search.setLabels(['home']);
    expect(search.ticketResults.map((t) => t.id)).toEqual(['A-1']);
    expect(search.noteResults.map((n) => n.id)).toEqual(['N-1']);
  });

  it('clear resets query and labels', () => {
    const search = useSearchStore();
    search.setQuery('x');
    search.setLabels(['y']);
    search.clear();
    expect(search.query).toBe('');
    expect(search.labels).toEqual([]);
    expect(search.hasQuery).toBe(false);
  });
});
