// @vitest-environment jsdom
// Explicit per-file pragma: on some Windows setups, vitest.config.ts's
// `environmentMatchGlobs` silently fails to select jsdom for test/renderer/**
// (a drive-letter casing mismatch inside vitest/pathe, not something fixable
// from this repo's config — see tester agent notes). The pragma is checked
// before environmentMatchGlobs, so it works regardless.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import type { Project } from '@models/Project';
import type { Ticket } from '@models/Ticket';

function makeProject(key: string, name: string): Project {
  return { key, name, counter: 0, created: new Date().toISOString() };
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'TODO-1',
    project: 'TODO',
    title: 'A',
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

const ptahMock = {
  tickets: {
    create: vi.fn(async (input: { project: string; title: string }) => ({
      ok: true as const,
      value: makeTicket({ project: input.project, title: input.title, id: `${input.project}-1` }),
    })),
  },
};
// `src/renderer/api.ts` reads `window.ptah` at module-load time, so it must be
// in place before any renderer module (store/component) is imported.
window.ptah = ptahMock as unknown as typeof window.ptah;

const { useProjectsStore } = await import('@renderer/stores/projects');
const { default: TicketDialog } = await import('@renderer/components/TicketDialog.vue');

beforeEach(() => {
  setActivePinia(createPinia());
  ptahMock.tickets.create.mockClear();
});

// TicketForm always renders 4 <select>s (Status, Priority, Due date is an
// input, then Project), so `wrapper.get('select')` alone is ambiguous — find
// the one inside the label whose text starts with "Project".
function getProjectSelect(wrapper: ReturnType<typeof mount>) {
  const projectLabel = wrapper.findAll('label').find((l) => l.text().startsWith('Project'));
  if (!projectLabel) throw new Error('Project label/select not found');
  return projectLabel.get('select');
}

describe('TicketDialog — default project selection', () => {
  it('defaults to TODO when no project is active and TODO exists', () => {
    const projects = useProjectsStore();
    projects.items = [makeProject('TODO', 'To Do'), makeProject('ACME', 'Acme')];
    projects.activeKey = null;

    const wrapper = mount(TicketDialog, { props: { projectKey: null } });
    const select = getProjectSelect(wrapper);
    expect((select.element as HTMLSelectElement).value).toBe('TODO');
  });

  it('defaults to the active project over the configured default', () => {
    const projects = useProjectsStore();
    projects.items = [makeProject('TODO', 'To Do'), makeProject('ACME', 'Acme')];
    projects.activeKey = 'ACME';

    const wrapper = mount(TicketDialog, { props: { projectKey: null } });
    const select = getProjectSelect(wrapper);
    expect((select.element as HTMLSelectElement).value).toBe('ACME');
  });

  it('defaults to the projectKey prop but the dropdown is still editable', async () => {
    const projects = useProjectsStore();
    projects.items = [makeProject('TODO', 'To Do'), makeProject('ACME', 'Acme')];
    projects.activeKey = 'TODO';

    const wrapper = mount(TicketDialog, { props: { projectKey: 'ACME' } });
    const select = getProjectSelect(wrapper);
    // Seeded from the `projectKey` prop, which takes priority over `activeKey`.
    expect((select.element as HTMLSelectElement).value).toBe('ACME');

    // The dropdown is still editable after mount — pick a different project.
    await select.setValue('TODO');
    await wrapper.get('input[required]').setValue('New ticket title');
    await wrapper.get('form').trigger('submit');
    await vi.waitUntil(() => ptahMock.tickets.create.mock.calls.length > 0);

    expect(ptahMock.tickets.create).toHaveBeenCalledTimes(1);
    expect(ptahMock.tickets.create.mock.calls[0][0]).toMatchObject({ project: 'TODO' });
  });
});
