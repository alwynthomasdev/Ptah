import { defineStore } from 'pinia';
import type { NewTicketInput, Ticket, TicketPatch } from '@models/Ticket';
import type { TicketFilter, TicketSort } from '@models/Filter';
import { filterAndSort } from '@models/Filter';
import { call, ptah } from '../api';

interface State {
  items: Ticket[];
  loaded: boolean;
  filter: TicketFilter;
  sort: TicketSort;
}

export const useTicketsStore = defineStore('tickets', {
  state: (): State => ({
    items: [],
    loaded: false,
    filter: {},
    sort: { key: 'priority', dir: 'desc' },
  }),
  getters: {
    /** Filtered + sorted, excluding backlog/archive (the "working set"). */
    visible(s): Ticket[] {
      return filterAndSort(
        s.items.filter((t) => t.status !== 'backlog' && t.status !== 'archive'),
        s.filter,
        s.sort,
      );
    },
    inStatus() {
      return (status: Ticket['status']) =>
        filterAndSort(
          this.items.filter((t) => t.status === status),
          this.filter,
          this.sort,
        );
    },
    allFilteredSorted(s): Ticket[] {
      return filterAndSort(s.items, s.filter, s.sort);
    },
  },
  actions: {
    async load(projectKey?: string) {
      this.items = await call(ptah.tickets.list(projectKey));
      this.loaded = true;
    },
    async create(input: NewTicketInput) {
      const ticket = await call(ptah.tickets.create(input));
      this.items.push(ticket);
      return ticket;
    },
    async update(id: string, patch: TicketPatch) {
      const updated = await call(ptah.tickets.update(id, patch));
      const i = this.items.findIndex((t) => t.id === id);
      if (i >= 0) this.items[i] = updated;
      return updated;
    },
    async remove(id: string) {
      await call(ptah.tickets.delete(id));
      this.items = this.items.filter((t) => t.id !== id);
    },
    setFilter(patch: Partial<TicketFilter>) {
      this.filter = { ...this.filter, ...patch };
    },
    setSort(sort: TicketSort) {
      this.sort = sort;
    },
  },
});
