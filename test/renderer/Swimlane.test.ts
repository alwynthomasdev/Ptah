// @vitest-environment jsdom
// Explicit per-file pragma: on some Windows setups, vitest.config.ts's
// `environmentMatchGlobs` silently fails to select jsdom for test/renderer/**
// (a drive-letter casing mismatch inside vitest/pathe). The pragma is checked
// before environmentMatchGlobs, so it works regardless.
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { Ticket } from '@models/Ticket';
import Swimlane from '@renderer/components/Swimlane.vue';

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'PTAH-1',
    project: 'PTAH',
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

function baseProps() {
  return {
    lanes: [
      { key: 'scheduled', label: 'Scheduled', color: 'var(--scheduled)', items: [] as Ticket[] },
      { key: 'wip', label: 'WIP', color: 'var(--wip)', items: [makeTicket()] },
      { key: 'done', label: 'Done', color: 'var(--done)', items: [] as Ticket[] },
    ],
    paused: [] as Ticket[],
  };
}

/** A stand-in DataTransfer carrying the ticket-id MIME jsdom doesn't implement. */
function dt(id: string) {
  return { getData: () => id, types: ['application/x-ptah-ticket'] };
}

describe('Swimlane', () => {
  it('emits move with the dropped ticket id and the target lane status', async () => {
    const wrapper = mount(Swimlane, { props: baseProps() });
    await wrapper.findAll('.lane-body')[2].trigger('drop', { dataTransfer: dt('PTAH-1') });
    expect(wrapper.emitted('move')).toEqual([['PTAH-1', 'done']]);
  });

  it('does not emit move when the card is dropped on its own lane', async () => {
    const wrapper = mount(Swimlane, { props: baseProps() });
    await wrapper.findAll('.lane-body')[1].trigger('drop', { dataTransfer: dt('PTAH-1') });
    expect(wrapper.emitted('move')).toBeUndefined();
  });

  it('bubbles open from a card', async () => {
    const wrapper = mount(Swimlane, { props: baseProps() });
    await wrapper.find('.lane-body .card').trigger('click');
    const emitted = wrapper.emitted('open');
    expect(emitted).toHaveLength(1);
    expect((emitted![0][0] as Ticket).id).toBe('PTAH-1');
  });

  it('shows card priority/snooze controls only when cardControls is set', () => {
    const plain = mount(Swimlane, { props: baseProps() });
    expect(plain.find('.card .prio-btn').exists()).toBe(false);

    const withControls = mount(Swimlane, {
      props: {
        ...baseProps(),
        lanes: [
          { key: 'wip', label: 'WIP', color: 'var(--wip)', items: [makeTicket({ due: '2020-01-01T00:00:00.000Z' })] },
        ],
        cardControls: true,
        cardSnooze: true,
      },
    });
    expect(withControls.find('.card .prio-btn').exists()).toBe(true);
    expect(withControls.find('.card .snooze-btn').exists()).toBe(true);
  });
});
