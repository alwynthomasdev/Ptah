import { BrowserWindow, dialog, ipcMain } from 'electron';
import { AppContext } from '@core/AppContext';
import { tryResult } from '@shared/result';
import type { AppConfig } from '@shared/ipc';
import { IPC } from '@shared/ipc';
import { loadConfig, saveConfig } from './config';

/**
 * Registers every IPC handler once, at startup. Each handler wraps its work in
 * `tryResult` so exceptions cross the boundary as `{ ok: false, error }`.
 *
 * `context` is mutable: pointing Ptah at a new data directory swaps it out
 * without re-registering handlers.
 */
export async function registerIpc(): Promise<void> {
  let config: AppConfig = await loadConfig();
  let context = new AppContext(config.dataDir);
  await context.init();

  const h = <T>(channel: string, fn: (...args: unknown[]) => Promise<T> | T) =>
    ipcMain.handle(channel, (_evt, ...args) => tryResult(() => fn(...args)));

  // ---- config ----------------------------------------------------------
  h(IPC.configGet, () => config);

  h(IPC.configSetTheme, async (theme) => {
    config = await saveConfig({ ...config, theme: theme as AppConfig['theme'] });
    return config;
  });

  h(IPC.configSetDataDir, async (dir) => {
    config = await saveConfig({ ...config, dataDir: String(dir) });
    context = new AppContext(config.dataDir);
    await context.init();
    return config;
  });

  h(IPC.configPickDataDir, async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const picked = await dialog.showOpenDialog(win, {
      title: 'Choose Ptah data folder',
      defaultPath: config.dataDir,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (picked.canceled || picked.filePaths.length === 0) return null;
    config = await saveConfig({ ...config, dataDir: picked.filePaths[0] });
    context = new AppContext(config.dataDir);
    await context.init();
    return config;
  });

  // ---- projects ------------------------------------------------------
  h(IPC.projectsList, () => context.projects.list());
  h(IPC.projectsCreate, (input) => context.projects.create(input as never));
  h(IPC.projectsRename, (key, name) => context.projects.rename(String(key), String(name)));
  h(IPC.projectsDelete, (key) => context.projects.delete(String(key)));

  // ---- tickets ------------------------------------------------------
  h(IPC.ticketsList, (projectKey) =>
    context.tickets.list(projectKey ? String(projectKey) : undefined),
  );
  h(IPC.ticketsGet, (id) => context.tickets.get(String(id)));
  h(IPC.ticketsCreate, (input) => context.tickets.create(input as never));
  h(IPC.ticketsUpdate, (id, patch) => context.tickets.update(String(id), patch as never));
  h(IPC.ticketsDelete, (id) => context.tickets.delete(String(id)));

  // ---- recycle bin -------------------------------------------------
  h(IPC.binList, () => context.recycleBin.list());
  h(IPC.binRestore, (id) => context.recycleBin.restore(String(id)));
  h(IPC.binPurge, (id) => context.recycleBin.purge(String(id)));
  h(IPC.binEmpty, () => context.recycleBin.empty());
}
