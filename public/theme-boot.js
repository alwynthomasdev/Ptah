/**
 * Runs before the Vue bundle and first paint. Reads the theme choice that the
 * settings store mirrors into localStorage and stamps `data-theme` on <html> so
 * a cold start doesn't flash the default (light) theme before config loads.
 *
 * The authoritative value still lives in the main process (userData/config.json);
 * the store reconciles this once IPC resolves. Keep the resolution here in sync
 * with `resolveTheme` in src/renderer/stores/settings.ts.
 */
(function () {
  try {
    var stored = localStorage.getItem('ptah-theme'); // 'light' | 'dark' | 'system' | null
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved =
      stored === 'light' || stored === 'dark'
        ? stored
        : (stored === 'system' || stored === null) && prefersDark
          ? 'dark'
          : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    /* localStorage/matchMedia unavailable — the store will set the theme shortly. */
  }
})();
