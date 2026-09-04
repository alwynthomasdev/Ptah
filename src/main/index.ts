import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, nativeTheme, net, protocol } from 'electron';
import { registerIpc } from './ipc';
import { loadConfig } from './config';
import { getDataDir, resolveMediaPath, setDataDir } from './appState';

// Bundled to CommonJS, so `__dirname` is available natively.
// dist-electron/main -> project root (or app.asar root when packaged)
const ROOT = path.join(__dirname, '../..');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// Must be called before `app.whenReady()`. Lets rendered Markdown load a
// ticket's local images via `ptah-media://media/<project>/<id>/<file>`.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'ptah-media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

// Mirrors tokens.css --bg (dark / light). Kept in sync by hand — the main
// process can't read the renderer's CSS variables.
const BG_DARK = '#14171c';
const BG_LIGHT = '#f3f2ee';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? BG_DARK : BG_LIGHT,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'icon.png')
      : path.join(ROOT, 'build/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (!app.isPackaged && DEV_SERVER_URL) {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(ROOT, 'dist/index.html'));
  }
}

app.whenReady().then(async () => {
  const config = await loadConfig();
  setDataDir(config.dataDir);
  nativeTheme.themeSource = config.theme;

  protocol.handle('ptah-media', async (request) => {
    const resolved = resolveMediaPath(getDataDir(), request.url);
    if (!resolved) return new Response(null, { status: 400 });
    try {
      return await net.fetch(pathToFileURL(resolved).toString());
    } catch {
      return new Response(null, { status: 404 });
    }
  });

  await registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
