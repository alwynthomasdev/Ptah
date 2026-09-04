import { defineStore } from 'pinia';
import type { NewTicketInput, Status, Ticket, TicketPatch } from '@models/Ticket';
import { STATUSES } from '@models/Ticket';
import type { TicketFilter, TicketSort } from '@models/Filter';
import { filterAndSort } from '@models/Filter';
import { call, ptah } from '../api';

export type ListScope = 'working' | 'backlog' | 'archive' | 'all';

/** Whether a ticket falls inside the current project filter (no filter = all). */
function inProjectScope(ticket: Ticket, filter: TicketFilter): boolean {
  return !filter.projects?.length || filter.projects.includes(ticket.project);
}

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
    /** Tally by status across the project scope (ignores text/label/priority filters). */
    statusCounts(s): Record<Status, number> {
      const counts = Object.fromEntries(STATUSES.map((st) => [st, 0])) as Record<Status, number>;
      for (const t of s.items) if (inProjectScope(t, s.filter)) counts[t.status] += 1;
      return counts;
    },
    /** Working-set size (excludes backlog/archive) across the project scope. */
    workingCount(s): number {
      let n = 0;
      for (const t of s.items) {
        if (inProjectScope(t, s.filter) && t.status !== 'backlog' && t.status !== 'archive') n += 1;
      }
      return n;
    },
    /** Sorted, distinct labels across the project scope. */
    labelsInView(s): string[] {
      const seen = new Set<string>();
      for (const t of s.items) {
        if (!inProjectScope(t, s.filter)) continue;
        for (const l of t.labels) seen.add(l);
      }
      return [...seen].sort((a, b) => a.localeCompare(b));
    },
    /** Scope filter (as TicketBrowser did), then the store's filter + sort. */
    scopedList() {
      return (scope: ListScope): Ticket[] => {
        const base =
          scope === 'backlog'
            ? this.items.filter((t) => t.status === 'backlog')
            : scope === 'archive'
              ? this.items.filter((t) => t.status === 'archive')
              : scope === 'working'
                ? this.items.filter((t) => t.status !== 'backlog' && t.status !== 'archive')
                : this.items;
        return filterAndSort(base, this.filter, this.sort);
      };
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
    /** Replace a ticket in the working set (or add it), e.g. after an
     *  out-of-band change like editing attachments. */
    upsert(ticket: Ticket) {
      const i = this.items.findIndex((t) => t.id === ticket.id);
      if (i >= 0) this.items[i] = ticket;
      else this.items.push(ticket);
    },
    setFilter(patch: Partial<TicketFilter>) {
      this.filter = { ...this.filter, ...patch };
    },
    setSort(sort: TicketSort) {
      this.sort = sort;
    },
  },
});
