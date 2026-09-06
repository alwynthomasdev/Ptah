import path from 'node:path';
import { app, BrowserWindow, nativeTheme, screen } from 'electron';

// dist-electron/main -> project root (or app.asar root when packaged)
const ROOT = path.join(__dirname, '../..');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// Mirrors tokens.css --bg (dark / light), same hand-synced pair as src/main/index.ts.
const BG_DARK = '#14171c';
const BG_LIGHT = '#f3f2ee';

// Content-box size of the popup. Tuned to the Quick Add form (header + title +
// project select + status line + footer). `useContentSize` keeps these honest
// regardless of the OS frame.
const WIDTH = 420;
const HEIGHT = 250;
const MARGIN = 16;

/**
 * The Quick Add window is a singleton: a small, frameless-feeling (native frame,
 * no min/max) always-on-top capture window parked in the bottom-right corner. It
 * loads the same renderer bundle at `#/quick-add`, where `App.vue` renders only
 * the wrapper view.
 */
let win: BrowserWindow | null = null;

function hashFor(projectKey: string | null): string {
  return projectKey ? `/quick-add?project=${encodeURIComponent(projectKey)}` : '/quick-add';
}

/** Bottom-right of the primary display's work area, inset by `MARGIN`. */
function bottomRight(): { x: number; y: number } {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + workArea.width - WIDTH - MARGIN,
    y: workArea.y + workArea.height - HEIGHT - MARGIN,
  };
}

/** Open the Quick Add window, or focus it if it is already open. */
export function openQuickAddWindow(projectKey: string | null): void {
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
    return;
  }

  const { x, y } = bottomRight();
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x,
    y,
    useContentSize: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: 'Quick add',
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? BG_DARK : BG_LIGHT,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // `true` alone usually floats above other apps on Windows; the explicit level
  // is belt-and-braces. Bump to 'screen-saver' only if it still slips under.
  win.setAlwaysOnTop(true, 'floating');
  win.once('ready-to-show', () => win?.show());
  win.on('closed', () => {
    win = null;
  });

  if (!app.isPackaged && DEV_SERVER_URL) {
    void win.loadURL(new URL(`#${hashFor(projectKey)}`, DEV_SERVER_URL).toString());
  } else {
    void win.loadFile(path.join(ROOT, 'dist/index.html'), { hash: hashFor(projectKey) });
  }
}

/** Close the Quick Add window if it is open. */
export function closeQuickAddWindow(): void {
  win?.close();
}
