import { defineStore } from 'pinia';
import type { NewProjectInput, Project } from '@models/Project';
import { call, ptah } from '../api';

interface State {
  items: Project[];
  activeKey: string | null;
  loaded: boolean;
}

export const useProjectsStore = defineStore('projects', {
  state: (): State => ({ items: [], activeKey: null, loaded: false }),
  getters: {
    active: (s): Project | null => s.items.find((p) => p.key === s.activeKey) ?? null,
    byKey: (s) => (key: string) => s.items.find((p) => p.key === key) ?? null,
  },
  actions: {
    async load() {
      this.items = await call(ptah.projects.list());
      if (!this.activeKey || !this.items.some((p) => p.key === this.activeKey)) {
        this.activeKey = this.items[0]?.key ?? null;
      }
      this.loaded = true;
    },
    setActive(key: string | null) {
      this.activeKey = key;
    },
    async create(input: NewProjectInput) {
      const project = await call(ptah.projects.create(input));
      await this.load();
      this.activeKey = project.key;
      return project;
    },
    async rename(key: string, name: string) {
      await call(ptah.projects.rename(key, name));
      await this.load();
    },
    async remove(key: string) {
      await call(ptah.projects.delete(key));
      if (this.activeKey === key) this.activeKey = null;
      await this.load();
    },
  },
});
