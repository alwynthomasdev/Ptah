import { defineStore } from 'pinia';
import type { Ticket } from '@models/Ticket';
import type { Note } from '@models/Note';
import { filterAndSort } from '@models/Filter';
import { filterAndSortNotes } from '@models/NoteFilter';
import { useTicketsStore } from './tickets';
import { useNotesStore } from './notes';

interface State {
  /** Free-text query, shared between the top-bar box and the search view. */
  query: string;
  /** Shared label facet, applied to both tickets and notes. */
  labels: string[];
}

/**
 * Cross-cutting "find anything" search. Reads the already-loaded `tickets` and
 * `notes` stores; it never fetches. Separate from the Toolbar's per-view search,
 * which narrows one table.
 */
export const useSearchStore = defineStore('search', {
  state: (): State => ({ query: '', labels: [] }),
  getters: {
    hasQuery: (s): boolean => s.query.trim().length > 0 || s.labels.length > 0,
    ticketResults(s): Ticket[] {
      if (!this.hasQuery) return [];
      const tickets = useTicketsStore();
      return filterAndSort(
        tickets.items,
        {
          text: s.query.trim() || undefined,
          labels: s.labels.length ? s.labels : undefined,
        },
        { key: 'priority', dir: 'desc' },
      );
    },
    noteResults(s): Note[] {
      if (!this.hasQuery) return [];
      const notes = useNotesStore();
      return filterAndSortNotes(
        notes.items,
        {
          text: s.query.trim() || undefined,
          labels: s.labels.length ? s.labels : undefined,
        },
        { key: 'updated', dir: 'desc' },
      );
    },
    totalCount(): number {
      return this.ticketResults.length + this.noteResults.length;
    },
  },
  actions: {
    setQuery(q: string) {
      this.query = q;
    },
    setLabels(labels: string[]) {
      this.labels = labels;
    },
    clear() {
      this.query = '';
      this.labels = [];
    },
  },
});
