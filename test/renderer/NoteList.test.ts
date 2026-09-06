// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import type { Note } from '@models/Note';
import NoteList from '../../src/renderer/components/NoteList.vue';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'NB-1',
    notebook: 'NB',
    title: 'A note',
    labels: [],
    body: '',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-02T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('NoteList', () => {
  it('shows the empty message when there are no notes', () => {
    const wrapper = mount(NoteList, { props: { notes: [], empty: 'Nothing here.' } });
    expect(wrapper.text()).toContain('Nothing here.');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('renders a row per note and emits open on row click', async () => {
    const notes = [makeNote({ id: 'NB-1' }), makeNote({ id: 'NB-2', title: 'Second' })];
    const wrapper = mount(NoteList, { props: { notes } });
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);

    await rows[1].trigger('click');
    expect((wrapper.emitted('open')?.[0]?.[0] as Note).id).toBe('NB-2');
  });

  it('emits remove without triggering open', async () => {
    const wrapper = mount(NoteList, { props: { notes: [makeNote()] } });
    await wrapper.get('.row-action').trigger('click');
    expect((wrapper.emitted('remove')?.[0]?.[0] as Note).id).toBe('NB-1');
    expect(wrapper.emitted('open')).toBeUndefined();
  });

  it('hides the Notebook column when hideNotebook is set', () => {
    const headized = mount(NoteList, { props: { notes: [makeNote()], hideNotebook: true } });
    expect(headized.findAll('thead th').map((h) => h.text())).not.toContain('Notebook');
  });
});
