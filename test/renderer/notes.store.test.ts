// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { Note } from '@models/Note';

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
  notes: { list: vi.fn(async () => ({ ok: true as const, value: [] as Note[] })) },
};
window.ptah = ptahMock as unknown as typeof window.ptah;

const { useNotesStore } = await import('@renderer/stores/notes');

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('notes store', () => {
  it('visible applies the filter and the updated-desc sort', () => {
    const store = useNotesStore();
    store.items = [
      makeNote({ id: 'NB-1', title: 'Alpha', updated: '2026-01-01T00:00:00.000Z', labels: ['x'] }),
      makeNote({ id: 'NB-2', title: 'Beta', updated: '2026-03-01T00:00:00.000Z', labels: ['x'] }),
      makeNote({ id: 'NB-3', title: 'Gamma', updated: '2026-02-01T00:00:00.000Z' }),
    ];
    store.setFilter({ labels: ['x'] });
    expect(store.visible.map((n) => n.id)).toEqual(['NB-2', 'NB-1']);
  });

  it('labelsInView is scoped to the notebook filter', () => {
    const store = useNotesStore();
    store.items = [
      makeNote({ id: 'NB-1', notebook: 'NB', labels: ['a'] }),
      makeNote({ id: 'WORK-1', notebook: 'WORK', labels: ['b'] }),
    ];
    store.setFilter({ notebooks: ['NB'] });
    expect(store.labelsInView).toEqual(['a']);
  });

  it('countForNotebook tallies live notes', () => {
    const store = useNotesStore();
    store.items = [
      makeNote({ id: 'NB-1', notebook: 'NB' }),
      makeNote({ id: 'NB-2', notebook: 'NB' }),
      makeNote({ id: 'WORK-1', notebook: 'WORK' }),
    ];
    expect(store.countForNotebook('NB')).toBe(2);
    expect(store.countForNotebook('WORK')).toBe(1);
  });
});
