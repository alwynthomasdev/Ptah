import { defineStore } from 'pinia';
import type { NewNotebookInput, Notebook } from '@models/Notebook';
import { DEFAULT_NOTEBOOK_KEY } from '@models/Notebook';
import { call, ptah } from '../api';

interface State {
  items: Notebook[];
  activeKey: string | null;
  loaded: boolean;
}

export const useNotebooksStore = defineStore('notebooks', {
  state: (): State => ({ items: [], activeKey: null, loaded: false }),
  getters: {
    active: (s): Notebook | null => s.items.find((n) => n.key === s.activeKey) ?? null,
    byKey: (s) => (key: string) => s.items.find((n) => n.key === key) ?? null,
    /** `items` with the default notebook pinned first (if present), rest left alphabetical. */
    orderedItems: (s): Notebook[] => {
      const items = s.items;
      const idx = items.findIndex((n) => n.key === DEFAULT_NOTEBOOK_KEY);
      if (idx <= 0) return items;
      const rest = items.filter((n) => n.key !== DEFAULT_NOTEBOOK_KEY);
      return [items[idx], ...rest];
    },
  },
  actions: {
    async load() {
      this.items = await call(ptah.notebooks.list());
      if (!this.activeKey || !this.items.some((n) => n.key === this.activeKey)) {
        this.activeKey = this.items[0]?.key ?? null;
      }
      this.loaded = true;
    },
    setActive(key: string | null) {
      this.activeKey = key;
    },
    async create(input: NewNotebookInput) {
      const notebook = await call(ptah.notebooks.create(input));
      await this.load();
      this.activeKey = notebook.key;
      return notebook;
    },
    async rename(key: string, name: string) {
      await call(ptah.notebooks.rename(key, name));
      await this.load();
    },
    async remove(key: string) {
      await call(ptah.notebooks.delete(key));
      if (this.activeKey === key) this.activeKey = null;
      await this.load();
    },
  },
});
