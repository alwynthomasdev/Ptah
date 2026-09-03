import { defineStore } from 'pinia';
import type { AppConfig } from '@shared/ipc';
import { call, ptah } from '../api';

type Theme = AppConfig['theme'];

interface State {
  dataDir: string;
  theme: Theme;
  loaded: boolean;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  root.setAttribute('data-theme', resolved);
}

export const useSettingsStore = defineStore('settings', {
  state: (): State => ({ dataDir: '', theme: 'system', loaded: false }),
  actions: {
    async load() {
      const cfg = await call(ptah.config.get());
      this.dataDir = cfg.dataDir;
      this.theme = cfg.theme;
      this.loaded = true;
      applyTheme(this.theme);
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme === 'system') applyTheme('system');
      });
    },
    async setTheme(theme: Theme) {
      const cfg = await call(ptah.config.setTheme(theme));
      this.theme = cfg.theme;
      applyTheme(this.theme);
    },
    async pickDataDir() {
      const cfg = await call(ptah.config.pickDataDir());
      if (cfg) this.dataDir = cfg.dataDir;
      return cfg;
    },
  },
});
