import path from 'node:path';
import { app, BrowserWindow, nativeTheme, screen } from 'electron';

// dist-electron/main -> project root (or app.asar root when packaged)
const ROOT = path.join(__dirname, '../..');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// Mirrors tokens.css --bg (dark / light), same hand-synced pair as src/main/index.ts.
const BG_DARK = '#14171c';
const BG_LIGHT = '#f3f2ee';

// Content-box size of the popup. Taller than Quick Add — it carries a markdown
// body field. `useContentSize` keeps these honest regardless of the OS frame.
const WIDTH = 420;
const HEIGHT = 340;
const MARGIN = 16;

/**
 * The Quick Note window is a singleton: a small, always-on-top capture window
 * parked in the bottom-left corner. It loads the same renderer bundle at
 * `#/quick-note`, where `App.vue` renders only the wrapper view.
 */
let win: BrowserWindow | null = null;

function hashFor(notebookKey: string | null): string {
  return notebookKey
    ? `/quick-note?notebook=${encodeURIComponent(notebookKey)}`
    : '/quick-note';
}

/** Bottom-left of the primary display's work area, inset by `MARGIN`. */
function bottomLeft(): { x: number; y: number } {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + MARGIN,
    y: workArea.y + workArea.height - HEIGHT - MARGIN,
  };
}

/** Open the Quick Note window, or focus it if it is already open. */
export function openQuickNoteWindow(notebookKey: string | null): void {
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
    return;
  }

  const { x, y } = bottomLeft();
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
    title: 'Quick note',
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

  win.setAlwaysOnTop(true, 'floating');
  win.once('ready-to-show', () => win?.show());
  win.on('closed', () => {
    win = null;
  });

  if (!app.isPackaged && DEV_SERVER_URL) {
    void win.loadURL(new URL(`#${hashFor(notebookKey)}`, DEV_SERVER_URL).toString());
  } else {
    void win.loadFile(path.join(ROOT, 'dist/index.html'), { hash: hashFor(notebookKey) });
  }
}

/** Close the Quick Note window if it is open. */
export function closeQuickNoteWindow(): void {
  win?.close();
}
