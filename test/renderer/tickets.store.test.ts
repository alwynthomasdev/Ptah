// @vitest-environment jsdom
// Explicit per-file pragma: on some Windows setups, vitest.config.ts's
// `environmentMatchGlobs` silently fails to select jsdom for test/renderer/**
// (a drive-letter casing mismatch inside vitest/pathe, not something fixable
// from this repo's config — see tester agent notes). The pragma is checked
// before environmentMatchGlobs, so it works regardless.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { Ticket } from '@models/Ticket';

function dayOffsetIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'TODO-1',
    project: 'TODO',
    title: 'A',
    type: 'task',
    parent: null,
    status: 'scheduled',
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

const ptahMock = {
  tickets: { list: vi.fn(async () => ({ ok: true as const, value: [] as Ticket[] })) },
};
window.ptah = ptahMock as unknown as typeof window.ptah;

const { useTicketsStore } = await import('@renderer/stores/tickets');

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('tickets store — dueToday', () => {
  it('lists open work due today or earlier, oldest first, ignoring the project filter', () => {
    const store = useTicketsStore();
    store.items = [
      makeTicket({ id: 'A-1', project: 'A', due: dayOffsetIso(0) }),
      makeTicket({ id: 'B-1', project: 'B', due: dayOffsetIso(-3) }),
      makeTicket({ id: 'B-2', project: 'B', due: dayOffsetIso(-1) }),
      makeTicket({ id: 'A-2', project: 'A', due: dayOffsetIso(1) }), // future — excluded
      makeTicket({ id: 'A-3', project: 'A', due: null }), // no due — excluded
    ];
    // A project scope that would hide B-* if the getter respected it.
    store.setFilter({ projects: ['A'] });

    expect(store.dueToday.map((t) => t.id)).toEqual(['B-1', 'B-2', 'A-1']);
  });

  it('excludes done and archived tickets', () => {
    const store = useTicketsStore();
    store.items = [
      makeTicket({ id: 'A-1', due: dayOffsetIso(-1), status: 'done' }),
      makeTicket({ id: 'A-2', due: dayOffsetIso(-1), status: 'archive' }),
      makeTicket({ id: 'A-3', due: dayOffsetIso(-1), status: 'wip' }),
    ];

    expect(store.dueToday.map((t) => t.id)).toEqual(['A-3']);
  });

  it('counts only the genuinely overdue (before today) rows', () => {
    const store = useTicketsStore();
    store.items = [
      makeTicket({ id: 'A-1', due: dayOffsetIso(0) }),
      makeTicket({ id: 'A-2', due: dayOffsetIso(-1) }),
      makeTicket({ id: 'A-3', due: dayOffsetIso(-5) }),
    ];

    expect(store.dueToday).toHaveLength(3);
    expect(store.dueTodayOverdueCount).toBe(2);
  });
});
