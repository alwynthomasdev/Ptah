import type { Priority, Ticket } from './Ticket';
import { PRIORITY_RANK } from './Ticket';

/** Descriptor for filtering a ticket list. All fields are ANDed together. */
export interface TicketFilter {
  /** Substring match against the title, case-insensitive. */
  text?: string;
  /** Ticket must carry every label listed here (case-insensitive). */
  labels?: string[];
  /** Restrict to these project keys. */
  projects?: string[];
  /** Restrict to these priorities. */
  priorities?: Priority[];
}

export type SortKey = 'priority' | 'created' | 'due';
export type SortDir = 'asc' | 'desc';

export interface TicketSort {
  key: SortKey;
  dir: SortDir;
}

export function matchesFilter(ticket: Ticket, filter: TicketFilter): boolean {
  if (filter.text) {
    if (!ticket.title.toLowerCase().includes(filter.text.trim().toLowerCase())) return false;
  }
  if (filter.labels && filter.labels.length) {
    const have = new Set(ticket.labels.map((l) => l.toLowerCase()));
    if (!filter.labels.every((l) => have.has(l.trim().toLowerCase()))) return false;
  }
  if (filter.projects && filter.projects.length) {
    if (!filter.projects.includes(ticket.project)) return false;
  }
  if (filter.priorities && filter.priorities.length) {
    if (!filter.priorities.includes(ticket.priority)) return false;
  }
  return true;
}

/** Comparable value for a sort key. Missing due dates sort last in asc order. */
function sortValue(ticket: Ticket, key: SortKey): number {
  switch (key) {
    case 'priority':
      return PRIORITY_RANK[ticket.priority];
    case 'created':
      return Date.parse(ticket.created) || 0;
    case 'due':
      return ticket.due ? Date.parse(ticket.due) || 0 : Number.POSITIVE_INFINITY;
  }
}

/** Return a new, sorted array. Ties break by id for a stable, predictable order. */
export function sortTickets(tickets: Ticket[], sort: TicketSort): Ticket[] {
  const factor = sort.dir === 'asc' ? 1 : -1;
  return [...tickets].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return a.id.localeCompare(b.id, undefined, { numeric: true });
    if (av === Number.POSITIVE_INFINITY) return 1;
    if (bv === Number.POSITIVE_INFINITY) return -1;
    return (av - bv) * factor;
  });
}

export function filterAndSort(tickets: Ticket[], filter: TicketFilter, sort: TicketSort): Ticket[] {
  return sortTickets(
    tickets.filter((t) => matchesFilter(t, filter)),
    sort,
  );
}
