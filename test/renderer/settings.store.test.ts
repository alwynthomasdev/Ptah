import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// This jsdom setup ships no Storage — provide a minimal in-memory one on both
// the bare global (the store uses `localStorage.setItem`) and `window`.
class MemStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}
const memStorage = new MemStorage();
vi.stubGlobal('localStorage', memStorage);
window.localStorage = memStorage as unknown as Storage;

/**
 * jsdom has no matchMedia — provide a controllable singleton so we can flip the
 * OS preference and fire `change`. Returning the same object every call mirrors
 * the browser and lets us count listeners.
 */
const mqlListeners = new Set<() => void>();
const mql = {
  matches: false,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addEventListener: vi.fn((_e: string, cb: () => void) => mqlListeners.add(cb)),
  removeEventListener: vi.fn((_e: string, cb: () => void) => mqlListeners.delete(cb)),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
};
function fireOsThemeChange() {
  for (const cb of [...mqlListeners]) cb();
}
window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

let cfg: { dataDir: string; theme: 'light' | 'dark' | 'system' } = {
  dataDir: '/data/Ptah',
  theme: 'system',
};
const ptahMock = {
  config: {
    get: vi.fn(async () => ({ ok: true as const, value: { ...cfg } })),
    setTheme: vi.fn(async (theme: 'light' | 'dark' | 'system') => {
      cfg = { ...cfg, theme };
      return { ok: true as const, value: { ...cfg } };
    }),
    pickDataDir: vi.fn(async () => ({ ok: true as const, value: null })),
  },
};
window.ptah = ptahMock as unknown as typeof window.ptah;

// Import after the globals are in place: the store registers its module-scope
// `change` listener at import time.
const { useSettingsStore, resolveTheme } = await import('@renderer/stores/settings');
const listenersAfterImport = mql.addEventListener.mock.calls.length;

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  mql.matches = false;
  cfg = { dataDir: '/data/Ptah', theme: 'system' };
  ptahMock.config.get.mockClear();
  ptahMock.config.setTheme.mockClear();
});

describe('resolveTheme', () => {
  it.each([
    ['light', true, 'light'],
    ['light', false, 'light'],
    ['dark', true, 'dark'],
    ['dark', false, 'dark'],
    ['system', true, 'dark'],
    ['system', false, 'light'],
  ] as const)('resolveTheme(%s, prefersDark=%s) -> %s', (theme, prefersDark, expected) => {
    expect(resolveTheme(theme, prefersDark)).toBe(expected);
  });
});

describe('settings store — theme lifecycle', () => {
  it('load() applies the resolved theme and mirrors the raw choice to localStorage', async () => {
    const store = useSettingsStore();
    await store.load();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('ptah-theme')).toBe('system');
  });

  it('load() with a persisted dark theme ends on data-theme="dark"', async () => {
    cfg.theme = 'dark';
    const store = useSettingsStore();
    await store.load();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('ptah-theme')).toBe('dark');
  });

  it('load() resolves system against the OS preference', async () => {
    mql.matches = true; // OS is dark
    const store = useSettingsStore();
    await store.load();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('setTheme() calls IPC, updates state, stamps data-theme, and mirrors to localStorage', async () => {
    const store = useSettingsStore();
    await store.setTheme('light');
    expect(ptahMock.config.setTheme).toHaveBeenCalledWith('light');
    expect(store.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('ptah-theme')).toBe('light');
  });

  it('does not stack matchMedia listeners across repeated load() calls', async () => {
    const store = useSettingsStore();
    await store.load();
    await store.load();
    await store.load();
    expect(mql.addEventListener.mock.calls.length).toBe(listenersAfterImport);
    expect(listenersAfterImport).toBe(1);
  });

  it('re-resolves on an OS theme change while on system', async () => {
    const store = useSettingsStore();
    await store.setTheme('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    mql.matches = true;
    fireOsThemeChange();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores an OS theme change when a concrete theme is selected', async () => {
    const store = useSettingsStore();
    await store.setTheme('light');
    mql.matches = true;
    fireOsThemeChange();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
