import { defineStore } from 'pinia';
import type { NewNoteInput, Note, NotePatch } from '@models/Note';
import type { NoteFilter, NoteSort } from '@models/NoteFilter';
import { filterAndSortNotes } from '@models/NoteFilter';
import { call, ptah } from '../api';

/** Whether a note falls inside the current notebook filter (no filter = all). */
function inNotebookScope(note: Note, filter: NoteFilter): boolean {
  return !filter.notebooks?.length || filter.notebooks.includes(note.notebook);
}

interface State {
  items: Note[];
  loaded: boolean;
  filter: NoteFilter;
  sort: NoteSort;
}

export const useNotesStore = defineStore('notes', {
  state: (): State => ({
    items: [],
    loaded: false,
    filter: {},
    sort: { key: 'updated', dir: 'desc' },
  }),
  getters: {
    /** Filtered + sorted for the current view. */
    visible(s): Note[] {
      return filterAndSortNotes(s.items, s.filter, s.sort);
    },
    /** Sorted, distinct labels across the notebook scope. */
    labelsInView(s): string[] {
      const seen = new Set<string>();
      for (const n of s.items) {
        if (!inNotebookScope(n, s.filter)) continue;
        for (const l of n.labels) seen.add(l);
      }
      return [...seen].sort((a, b) => a.localeCompare(b));
    },
    /** Live note count for one notebook. */
    countForNotebook(s) {
      return (key: string): number => s.items.filter((n) => n.notebook === key).length;
    },
  },
  actions: {
    async load(notebookKey?: string) {
      this.items = await call(ptah.notes.list(notebookKey));
      this.loaded = true;
    },
    async create(input: NewNoteInput) {
      const note = await call(ptah.notes.create(input));
      this.items.push(note);
      return note;
    },
    async update(id: string, patch: NotePatch) {
      const updated = await call(ptah.notes.update(id, patch));
      const i = this.items.findIndex((n) => n.id === id);
      if (i >= 0) this.items[i] = updated;
      return updated;
    },
    async changeNotebook(id: string, notebookKey: string) {
      const updated = await call(ptah.notes.changeNotebook(id, notebookKey));
      this.items = this.items.filter((n) => n.id !== id);
      this.items.push(updated);
      return updated;
    },
    async remove(id: string) {
      await call(ptah.notes.delete(id));
      this.items = this.items.filter((n) => n.id !== id);
    },
    /** Replace a note in the list (or add it). */
    upsert(note: Note) {
      const i = this.items.findIndex((n) => n.id === note.id);
      if (i >= 0) this.items[i] = note;
      else this.items.push(note);
    },
    setFilter(patch: Partial<NoteFilter>) {
      this.filter = { ...this.filter, ...patch };
    },
    setSort(sort: NoteSort) {
      this.sort = sort;
    },
  },
});
