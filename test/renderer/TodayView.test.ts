// @vitest-environment jsdom
// Explicit per-file pragma: on some Windows setups, vitest.config.ts's
// `environmentMatchGlobs` silently fails to select jsdom for test/renderer/**
// (a drive-letter casing mismatch inside vitest/pathe). The pragma is checked
// before environmentMatchGlobs, so it works regardless.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import type { Ticket } from '@models/Ticket';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// jsdom's localStorage is flaky under this vitest setup (opaque origin on some
// Windows runs), so pin a deterministic in-memory one the component shares.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  clear(): void {
    this.m.clear();
  }
}
vi.stubGlobal('localStorage', new MemStorage());

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'PTAH-1',
    project: 'PTAH',
    title: 'A',
    type: 'task',
    parent: null,
    status: 'wip',
    priority: 'medium',
    // Well in the past so it always lands in `dueToday`.
    due: '2020-01-01T00:00:00.000Z',
    labels: [],
    urls: [],
    description: '',
    attachments: [],
    created: '2020-01-01T00:00:00.000Z',
    updated: '2020-01-01T00:00:00.000Z',
    ...overrides,
  } as Ticket;
}

const ptahMock = {
  tickets: {
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => ({
      ok: true as const,
      value: makeTicket({ id, ...(patch as Partial<Ticket>) }),
    })),
  },
  io: { exportTicket: vi.fn(async () => ({ ok: true as const, value: undefined })) },
};
// api.ts reads window.ptah at module load, so set it before importing renderer code.
window.ptah = ptahMock as unknown as typeof window.ptah;

const { useTicketsStore } = await import('@renderer/stores/tickets');
const { default: TodayView } = await import('@renderer/views/TodayView.vue');

beforeEach(() => {
  setActivePinia(createPinia());
  ptahMock.tickets.update.mockClear();
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

function seed(items: Ticket[]) {
  const store = useTicketsStore();
  store.items = items;
  store.loaded = true;
  return store;
}

describe('TodayView', () => {
  it('defaults to the list view', () => {
    seed([makeTicket()]);
    const wrapper = mount(TodayView);
    expect(wrapper.find('.list-table').exists()).toBe(true);
    expect(wrapper.find('.lanes').exists()).toBe(false);
  });

  it('switches to the swimlane and persists the choice', async () => {
    seed([makeTicket()]);
    const wrapper = mount(TodayView);
    await wrapper.findAll('.view-toggle button')[1].trigger('click'); // "Swimlane"
    await flushPromises();
    expect(wrapper.find('.lanes').exists()).toBe(true);
    expect(wrapper.find('.list-table').exists()).toBe(false);
    expect(localStorage.getItem('ptah-today-view')).toBe('swimlane');
  });

  it('opens in the last-used view from localStorage', () => {
    localStorage.setItem('ptah-today-view', 'swimlane');
    seed([makeTicket()]);
    const wrapper = mount(TodayView);
    expect(wrapper.find('.lanes').exists()).toBe(true);
  });

  it('persists a priority change from the list view (regression guard)', async () => {
    seed([makeTicket({ priority: 'medium' })]);
    const wrapper = mount(TodayView);

    await wrapper.find('.cell-priority .prio-btn').trigger('click');
    const highest = wrapper.findAll('.cell-priority .menu-opt').find((o) => o.text() === 'Highest');
    await highest!.trigger('click');
    await flushPromises();

    expect(ptahMock.tickets.update).toHaveBeenCalledWith('PTAH-1', { priority: 'highest' });
  });

  it('groups the Today set into status lanes with an empty Done drop target', async () => {
    seed([
      makeTicket({ id: 'PTAH-1', status: 'wip' }),
      makeTicket({ id: 'PTAH-2', status: 'backlog' }),
      makeTicket({ id: 'PTAH-3', status: 'paused' }),
    ]);
    localStorage.setItem('ptah-today-view', 'swimlane');
    const wrapper = mount(TodayView);

    const laneHeads = wrapper.findAll('.lane-head').map((h) => h.text());
    expect(laneHeads.some((t) => t.startsWith('Backlog'))).toBe(true);
    expect(laneHeads.some((t) => t.startsWith('Done'))).toBe(true);
    // Done lane is always empty; the three seeded tickets sit in backlog/wip + paused tray.
    expect(wrapper.findAll('.lane-body .card')).toHaveLength(2);
    expect(wrapper.findAll('.paused-tray-body .card')).toHaveLength(1);
  });
});
