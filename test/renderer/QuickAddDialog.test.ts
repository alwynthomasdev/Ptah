// @vitest-environment jsdom
// Explicit per-file pragma: on some Windows setups, vitest.config.ts's
// `environmentMatchGlobs` silently fails to select jsdom for test/renderer/**
// (a drive-letter casing mismatch inside vitest/pathe, not something fixable
// from this repo's config — see tester agent notes). The pragma is checked
// before environmentMatchGlobs, so it works regardless.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import type { Project } from '@models/Project';
import type { Ticket } from '@models/Ticket';
import { todayIso } from '@shared/dates';

function makeProject(key: string, name: string): Project {
  return { key, name, counter: 0, created: new Date().toISOString() };
}

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
    updated: new Date().toISOString(),
    ...overrides,
  } as Ticket;
}

let n = 0;
const ptahMock = {
  tickets: {
    create: vi.fn(async (input: { project: string; title: string }) => ({
      ok: true as const,
      value: makeTicket({ project: input.project, title: input.title, id: `${input.project}-${++n}` }),
    })),
  },
};
// `src/renderer/api.ts` reads `window.ptah` at module-load time, so it must be
// in place before any renderer module (store/component) is imported.
window.ptah = ptahMock as unknown as typeof window.ptah;

const { useProjectsStore } = await import('@renderer/stores/projects');
const { default: QuickAddDialog } = await import('@renderer/components/QuickAddDialog.vue');

beforeEach(() => {
  setActivePinia(createPinia());
  ptahMock.tickets.create.mockClear();
  n = 0;
});

function getProjectSelect(wrapper: ReturnType<typeof mount>) {
  const projectLabel = wrapper.findAll('label').find((l) => l.text().startsWith('Project'));
  if (!projectLabel) throw new Error('Project label/select not found');
  return projectLabel.get('select');
}

function seedProjects(activeKey: string | null, ...keys: [string, string][]) {
  const projects = useProjectsStore();
  projects.items = keys.map(([k, name]) => makeProject(k, name));
  projects.activeKey = activeKey;
  return projects;
}

describe('QuickAddDialog — default project selection', () => {
  it('defaults to TODO when no project is active and TODO exists', () => {
    seedProjects(null, ['TODO', 'To Do'], ['ACME', 'Acme']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: null } });
    expect((getProjectSelect(wrapper).element as HTMLSelectElement).value).toBe('TODO');
  });

  it('prefers the active project over TODO', () => {
    seedProjects('ACME', ['TODO', 'To Do'], ['ACME', 'Acme']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: null } });
    expect((getProjectSelect(wrapper).element as HTMLSelectElement).value).toBe('ACME');
  });

  it('the projectKey prop wins over the active project', () => {
    seedProjects('TODO', ['TODO', 'To Do'], ['ACME', 'Acme']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'ACME' } });
    expect((getProjectSelect(wrapper).element as HTMLSelectElement).value).toBe('ACME');
  });
});

describe('QuickAddDialog — rapid add loop', () => {
  it('creates a ticket with just title + project (trimmed) and stays open', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO' } });

    await wrapper.get('input[required]').setValue('  first idea  ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(ptahMock.tickets.create).toHaveBeenCalledTimes(1);
    expect(ptahMock.tickets.create.mock.calls[0][0]).toEqual({
      title: 'first idea',
      project: 'TODO',
      due: todayIso(),
    });

    // Still mounted, no close emitted, title cleared, project kept, id shown.
    expect(wrapper.emitted('close')).toBeUndefined();
    expect((wrapper.get('input[required]').element as HTMLInputElement).value).toBe('');
    expect((getProjectSelect(wrapper).element as HTMLSelectElement).value).toBe('TODO');
    expect(wrapper.text()).toContain('Added TODO-1');
    expect(wrapper.emitted('created')?.[0]?.[0]).toMatchObject({ id: 'TODO-1' });
  });

  it('adds another after the first and updates the confirmation line', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO' } });

    await wrapper.get('input[required]').setValue('one');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    await wrapper.get('input[required]').setValue('two');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(ptahMock.tickets.create).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Added TODO-2');
    expect(wrapper.emitted('created')).toHaveLength(2);
  });

  it('clears the "Added" line once the next title is typed', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO' } });

    await wrapper.get('input[required]').setValue('one');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Added TODO-1');

    await wrapper.get('input[required]').setValue('typing again');
    expect(wrapper.text()).not.toContain('Added TODO-1');
  });

  it('does not submit a blank title', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO' } });

    await wrapper.get('input[required]').setValue('   ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(ptahMock.tickets.create).not.toHaveBeenCalled();
  });
});

describe('QuickAddDialog — closing', () => {
  it('emits close from the ✕ button', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO' } });
    await wrapper.get('header button').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits close on Escape', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO' } });
    await wrapper.get('.backdrop').trigger('keydown.esc');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});

describe('QuickAddDialog — embedded mode', () => {
  it('renders inline without the modal backdrop', () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO', embedded: true } });
    expect(wrapper.find('.backdrop').exists()).toBe(false);
    expect(wrapper.find('.embedded').exists()).toBe(true);
    expect(wrapper.find('.dialog.flush').exists()).toBe(true);
  });

  it('still emits close from the ✕ button', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO', embedded: true } });
    await wrapper.get('header button').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('still emits close on Escape', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO', embedded: true } });
    await wrapper.get('.embedded').trigger('keydown.esc');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('still creates a ticket and stays open (rapid add unchanged)', async () => {
    seedProjects('TODO', ['TODO', 'To Do']);
    const wrapper = mount(QuickAddDialog, { props: { projectKey: 'TODO', embedded: true } });

    await wrapper.get('input[required]').setValue('embedded idea');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(ptahMock.tickets.create).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('close')).toBeUndefined();
    expect(wrapper.text()).toContain('Added TODO-1');
  });
});
