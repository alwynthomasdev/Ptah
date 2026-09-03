import path from 'node:path';
import { app, BrowserWindow, nativeTheme } from 'electron';
import { registerIpc } from './ipc';
import { loadConfig } from './config';

// Bundled to CommonJS, so `__dirname` is available natively.
// dist-electron/main -> project root
const ROOT = path.join(__dirname, '../..');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.APP_ROOT = ROOT;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (DEV_SERVER_URL) {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(ROOT, 'dist/index.html'));
  }
}

app.whenReady().then(async () => {
  const config = await loadConfig();
  nativeTheme.themeSource = config.theme;
  await registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
