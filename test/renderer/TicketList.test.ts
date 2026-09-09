// @vitest-environment jsdom
// Explicit per-file pragma: on some Windows setups, vitest.config.ts's
// `environmentMatchGlobs` silently fails to select jsdom for test/renderer/**
// (a drive-letter casing mismatch inside vitest/pathe). The pragma is checked
// before environmentMatchGlobs, so it works regardless.
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { Ticket } from '@models/Ticket';
import { addToDate, nextMonday, todayIso } from '@shared/dates';
import TicketList from '../../src/renderer/components/TicketList.vue';

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'TODO-1',
    project: 'TODO',
    title: 'A',
    type: 'task',
    parent: null,
    status: 'wip',
    priority: 'medium',
    due: null,
    labels: [],
    urls: [],
    description: '',
    attachments: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Ticket;
}

/** A due date `n` whole days from today (negative = overdue). */
function dueInDays(n: number): string {
  return addToDate(todayIso(), { days: n });
}

describe('TicketList — due column', () => {
  it('renders the due date relative to today with an urgency class', () => {
    const wrapper = mount(TicketList, {
      props: { tickets: [makeTicket({ due: dueInDays(-2) })], variant: 'list' },
    });
    const cell = wrapper.find('td.due');
    expect(cell.text()).toContain('2 days overdue');
    expect(cell.classes()).toContain('due--overdue');
  });

  it('does not show the snooze trigger unless showSnooze is set', () => {
    const wrapper = mount(TicketList, {
      props: { tickets: [makeTicket({ due: dueInDays(-1) })], variant: 'list' },
    });
    expect(wrapper.find('.snooze-btn').exists()).toBe(false);
  });
});

describe('TicketList — snooze menu', () => {
  it('emits set-due with a today-relative ISO when a preset is picked', async () => {
    const ticket = makeTicket({ due: dueInDays(-3) });
    const wrapper = mount(TicketList, {
      props: { tickets: [ticket], variant: 'list', showSnooze: true },
    });

    await wrapper.find('.snooze-btn').trigger('click');
    const options = wrapper.findAll('.menu .menu-opt');
    expect(options.map((o) => o.text())).toEqual([
      'Tomorrow',
      'In 3 days',
      'Next Monday',
      'In 1 week',
      'In 2 weeks',
      'In 1 month',
    ]);

    await options[3].trigger('click'); // "In 1 week"

    const emitted = wrapper.emitted('setDue');
    expect(emitted).toHaveLength(1);
    expect((emitted![0][0] as Ticket).id).toBe(ticket.id);
    expect(emitted![0][1]).toBe(addToDate(todayIso(), { days: 7 }));
    // Menu closes after a pick.
    expect(wrapper.find('.menu').exists()).toBe(false);
  });

  it('emits set-due with the coming Monday for the "Next Monday" preset', async () => {
    const ticket = makeTicket({ due: dueInDays(-3) });
    const wrapper = mount(TicketList, {
      props: { tickets: [ticket], variant: 'list', showSnooze: true },
    });

    await wrapper.find('.snooze-btn').trigger('click');
    const nextMondayOpt = wrapper.findAll('.menu .menu-opt').find((o) => o.text() === 'Next Monday');
    await nextMondayOpt!.trigger('click');

    const emitted = wrapper.emitted('setDue');
    expect(emitted).toHaveLength(1);
    expect(emitted![0][1]).toBe(nextMonday());
  });

  it('opening the menu does not emit open (row navigation is suppressed)', async () => {
    const wrapper = mount(TicketList, {
      props: { tickets: [makeTicket({ due: dueInDays(0) })], variant: 'list', showSnooze: true },
    });
    await wrapper.find('.snooze-btn').trigger('click');
    expect(wrapper.emitted('open')).toBeUndefined();
  });
});
