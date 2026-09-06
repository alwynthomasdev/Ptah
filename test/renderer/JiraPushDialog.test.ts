// @vitest-environment jsdom
// Explicit pragma — see the note in TicketDialog.test.ts about environmentMatchGlobs.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import type { Ticket } from '@models/Ticket';

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'AB-1',
    project: 'AB',
    title: 'Ship it',
    type: 'task',
    parent: null,
    status: 'wip',
    priority: 'high',
    due: null,
    labels: [],
    urls: [],
    description: 'body',
    attachments: [],
    created: new Date().toISOString(),
    ...overrides,
  } as Ticket;
}

const ptahMock = {
  jira: {
    getSettings: vi.fn(async () => ({
      ok: true as const,
      value: { baseUrl: 'https://x.atlassian.net', email: 'me@x.com', connected: true },
    })),
    listProjects: vi.fn(async () => ({
      ok: true as const,
      value: [{ id: '10', key: 'AB', name: 'Alpha Beta' }],
    })),
    listIssueTypes: vi.fn(async () => ({
      ok: true as const,
      value: [
        { id: '1', name: 'Task' },
        { id: '2', name: 'Bug' },
      ],
    })),
    pushTicket: vi.fn(async () => ({
      ok: true as const,
      value: { issueKey: 'AB-9', url: 'https://x.atlassian.net/browse/AB-9' },
    })),
  },
};
window.ptah = ptahMock as unknown as typeof window.ptah;

const { default: JiraPushDialog } = await import('@renderer/components/JiraPushDialog.vue');

beforeEach(() => {
  setActivePinia(createPinia());
  Object.values(ptahMock.jira).forEach((fn) => fn.mockClear());
  ptahMock.jira.getSettings.mockResolvedValue({
    ok: true,
    value: { baseUrl: 'https://x.atlassian.net', email: 'me@x.com', connected: true },
  });
});

function labelSelect(wrapper: ReturnType<typeof mount>, prefix: string) {
  const label = wrapper.findAll('label').find((l) => l.text().startsWith(prefix));
  if (!label) throw new Error(`no label starting with "${prefix}"`);
  return label.get('select');
}

describe('JiraPushDialog', () => {
  it('prompts to configure Jira when it is not connected', async () => {
    ptahMock.jira.getSettings.mockResolvedValueOnce({
      ok: true,
      value: { baseUrl: '', email: '', connected: false },
    });

    const wrapper = mount(JiraPushDialog, { props: { ticket: makeTicket() } });
    await flushPromises();

    expect(wrapper.text()).toContain('Settings → Jira integration');
    expect(ptahMock.jira.listProjects).not.toHaveBeenCalled();
  });

  it('loads projects, then issue types on project pick, and gates the Push button', async () => {
    const wrapper = mount(JiraPushDialog, { props: { ticket: makeTicket() } });
    await flushPromises();

    expect(ptahMock.jira.listProjects).toHaveBeenCalled();
    const pushBtn = wrapper.findAll('button').find((b) => b.text().startsWith('Push to Jira'))!;
    expect(pushBtn.attributes('disabled')).toBeDefined();

    await labelSelect(wrapper, 'Jira project').setValue('10');
    await flushPromises();
    expect(ptahMock.jira.listIssueTypes).toHaveBeenCalledWith('10');

    // "Task" is auto-selected, so the button is now enabled.
    expect(pushBtn.attributes('disabled')).toBeUndefined();
  });

  it('pushes and emits the result', async () => {
    const wrapper = mount(JiraPushDialog, { props: { ticket: makeTicket() } });
    await flushPromises();

    await labelSelect(wrapper, 'Jira project').setValue('10');
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Push to Jira'))!
      .trigger('click');
    await flushPromises();

    expect(ptahMock.jira.pushTicket).toHaveBeenCalledWith('AB-1', {
      projectId: '10',
      issueTypeId: '1',
    });
    expect(wrapper.emitted('pushed')?.[0]?.[0]).toEqual({
      issueKey: 'AB-9',
      url: 'https://x.atlassian.net/browse/AB-9',
    });
  });

  it('warns when the ticket already links an issue on this site', async () => {
    const wrapper = mount(JiraPushDialog, {
      props: { ticket: makeTicket({ urls: ['https://x.atlassian.net/browse/AB-3'] }) },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('already links a Jira issue');
  });
});
