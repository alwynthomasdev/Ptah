import { defineStore } from 'pinia';
import type { AppConfig } from '@shared/ipc';
import { call, ptah } from '../api';

type Theme = AppConfig['theme'];

interface State {
  dataDir: string;
  theme: Theme;
  loaded: boolean;
}

/** localStorage key the pre-paint boot script (public/theme-boot.js) reads. */
const THEME_KEY = 'ptah-theme';

/** Resolve a theme choice to a concrete `light`/`dark`. Kept in sync with theme-boot.js. */
export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  return prefersDark ? 'dark' : 'light';
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme, prefersDark()));
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode / storage disabled — the boot script just falls back to matchMedia */
  }
}

// Bound once, at module load: re-resolve when the OS theme flips and we're on `system`.
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const s = useSettingsStore();
    if (s.theme === 'system') applyTheme('system');
  });
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
