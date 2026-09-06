// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import type { Notebook } from '@models/Notebook';
import type { Note } from '@models/Note';

function makeNotebook(key: string, name: string): Notebook {
  return { key, name, counter: 0, created: new Date().toISOString() };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'NOTEBOOK-1',
    notebook: 'NOTEBOOK',
    title: 'A',
    labels: [],
    body: '',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

let n = 0;
const ptahMock = {
  notes: {
    create: vi.fn(async (input: { notebook: string; title: string; body?: string }) => ({
      ok: true as const,
      value: makeNote({
        notebook: input.notebook,
        title: input.title,
        body: input.body ?? '',
        id: `${input.notebook}-${++n}`,
      }),
    })),
  },
};
window.ptah = ptahMock as unknown as typeof window.ptah;

const { useNotebooksStore } = await import('@renderer/stores/notebooks');
const { default: QuickNoteDialog } = await import('@renderer/components/QuickNoteDialog.vue');

beforeEach(() => {
  setActivePinia(createPinia());
  ptahMock.notes.create.mockClear();
  n = 0;
});

function getNotebookSelect(wrapper: ReturnType<typeof mount>) {
  const label = wrapper.findAll('label').find((l) => l.text().startsWith('Notebook'));
  if (!label) throw new Error('Notebook label/select not found');
  return label.get('select');
}

function seedNotebooks(activeKey: string | null, ...keys: [string, string][]) {
  const notebooks = useNotebooksStore();
  notebooks.items = keys.map(([k, name]) => makeNotebook(k, name));
  notebooks.activeKey = activeKey;
  return notebooks;
}

describe('QuickNoteDialog — default notebook selection', () => {
  it('defaults to NOTEBOOK when none is active and NOTEBOOK exists', () => {
    seedNotebooks(null, ['NOTEBOOK', 'notebook'], ['WORK', 'Work']);
    const wrapper = mount(QuickNoteDialog, { props: { notebookKey: null } });
    expect((getNotebookSelect(wrapper).element as HTMLSelectElement).value).toBe('NOTEBOOK');
  });

  it('prefers the active notebook, and the prop wins over that', () => {
    seedNotebooks('WORK', ['NOTEBOOK', 'notebook'], ['WORK', 'Work']);
    expect(
      (
        getNotebookSelect(mount(QuickNoteDialog, { props: { notebookKey: null } }))
          .element as HTMLSelectElement
      ).value,
    ).toBe('WORK');
    expect(
      (
        getNotebookSelect(mount(QuickNoteDialog, { props: { notebookKey: 'NOTEBOOK' } }))
          .element as HTMLSelectElement
      ).value,
    ).toBe('NOTEBOOK');
  });
});

describe('QuickNoteDialog — rapid add loop', () => {
  it('creates a note with title + notebook + body (trimmed title) and stays open', async () => {
    seedNotebooks('NOTEBOOK', ['NOTEBOOK', 'notebook']);
    const wrapper = mount(QuickNoteDialog, { props: { notebookKey: 'NOTEBOOK' } });

    await wrapper.get('input[required]').setValue('  first idea  ');
    await wrapper.get('textarea').setValue('some body');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(ptahMock.notes.create).toHaveBeenCalledTimes(1);
    expect(ptahMock.notes.create.mock.calls[0][0]).toEqual({
      title: 'first idea',
      notebook: 'NOTEBOOK',
      body: 'some body',
    });

    expect(wrapper.emitted('close')).toBeUndefined();
    expect((wrapper.get('input[required]').element as HTMLInputElement).value).toBe('');
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('');
    expect(wrapper.text()).toContain('Added NOTEBOOK-1');
    expect(wrapper.emitted('created')?.[0]?.[0]).toMatchObject({ id: 'NOTEBOOK-1' });
  });

  it('does not submit a blank title', async () => {
    seedNotebooks('NOTEBOOK', ['NOTEBOOK', 'notebook']);
    const wrapper = mount(QuickNoteDialog, { props: { notebookKey: 'NOTEBOOK' } });
    await wrapper.get('input[required]').setValue('   ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(ptahMock.notes.create).not.toHaveBeenCalled();
  });
});

describe('QuickNoteDialog — embedded mode', () => {
  it('renders inline without the modal backdrop', () => {
    seedNotebooks('NOTEBOOK', ['NOTEBOOK', 'notebook']);
    const wrapper = mount(QuickNoteDialog, { props: { notebookKey: 'NOTEBOOK', embedded: true } });
    expect(wrapper.find('.backdrop').exists()).toBe(false);
    expect(wrapper.find('.dialog.flush').exists()).toBe(true);
  });

  it('emits close from the ✕ button', async () => {
    seedNotebooks('NOTEBOOK', ['NOTEBOOK', 'notebook']);
    const wrapper = mount(QuickNoteDialog, { props: { notebookKey: 'NOTEBOOK', embedded: true } });
    await wrapper.get('header button').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
