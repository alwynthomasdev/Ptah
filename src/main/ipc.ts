import { BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron';
import { AppContext } from '@core/AppContext';
import { tryResult } from '@shared/result';
import type { AppConfig } from '@shared/ipc';
import { IPC } from '@shared/ipc';
import { loadConfig, saveConfig } from './config';
import { setDataDir } from './appState';
import { checkForUpdate, downloadUpdate, installUpdate } from './updater';
import { connect as claudeConnect, detect as claudeDetect, disconnect as claudeDisconnect } from '../mcp/integration';
import type { ClaudeTarget } from '@shared/ipc';

/**
 * Registers every IPC handler once, at startup. Each handler wraps its work in
 * `tryResult` so exceptions cross the boundary as `{ ok: false, error }`.
 *
 * `context` is mutable: pointing Ptah at a new data directory swaps it out
 * without re-registering handlers.
 */
export async function registerIpc(): Promise<void> {
  let config: AppConfig = await loadConfig();
  setDataDir(config.dataDir);
  let context = new AppContext(config.dataDir);
  await context.init(config.defaultProjectName);

  const h = <T>(channel: string, fn: (...args: unknown[]) => Promise<T> | T) =>
    ipcMain.handle(channel, (_evt, ...args) => tryResult(() => fn(...args)));

  /**
   * Point Ptah at a new data directory: persist it, repoint the media protocol,
   * rebuild the service context, then reload every window so the renderer boots
   * fresh against the new location (no stale dialogs, filters, or cached bodies).
   * Existing files in the old folder are left untouched.
   */
  const applyDataDir = async (dir: string): Promise<AppConfig> => {
    config = await saveConfig({ ...config, dataDir: dir });
    setDataDir(config.dataDir);
    context = new AppContext(config.dataDir);
    await context.init(config.defaultProjectName);
    // Defer so this IPC reply is flushed before the page tears down.
    setTimeout(() => {
      for (const w of BrowserWindow.getAllWindows()) w.reload();
    }, 0);
    return config;
  };

  // ---- config ----------------------------------------------------------
  h(IPC.configGet, () => config);

  h(IPC.configSetTheme, async (theme) => {
    config = await saveConfig({ ...config, theme: theme as AppConfig['theme'] });
    nativeTheme.themeSource = config.theme;
    return config;
  });

  h(IPC.configSetDataDir, async (dir) => applyDataDir(String(dir)));

  h(IPC.configSetDefaultProjectName, async (name) => {
    const trimmed = String(name).trim();
    if (!trimmed) throw new Error('Default project name must not be empty.');
    config = await saveConfig({ ...config, defaultProjectName: trimmed });
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
    const dir = picked.filePaths[0];

    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Use this folder', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      message: 'Switch Ptah data folder?',
      detail:
        `Ptah will reload and read tickets from:\n${dir}\n\n` +
        'Your existing data in the current folder is left untouched.',
    });
    if (response !== 0) return null;

    return applyDataDir(dir);
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
  h(IPC.ticketsListChildren, (id) => context.tickets.listChildren(String(id)));
  h(IPC.ticketsGet, (id) => context.tickets.get(String(id)));
  h(IPC.ticketsCreate, (input) => context.tickets.create(input as never));
  h(IPC.ticketsUpdate, (id, patch) => context.tickets.update(String(id), patch as never));
  h(IPC.ticketsChangeProject, (id, projectKey) =>
    context.tickets.changeProject(String(id), String(projectKey)),
  );
  h(IPC.ticketsDelete, (id) => context.tickets.delete(String(id)));

  // ---- system ------------------------------------------------------
  h(IPC.systemOpenExternal, async (url) => {
    const u = String(url);
    if (!/^(https?:|mailto:)/i.test(u)) throw new Error(`Refused to open non-web URL: ${u}`);
    await shell.openExternal(u);
  });

  // ---- recycle bin -------------------------------------------------
  h(IPC.binList, () => context.recycleBin.list());
  h(IPC.binRestore, (id) => context.recycleBin.restore(String(id)));
  h(IPC.binPurge, (id) => context.recycleBin.purge(String(id)));
  h(IPC.binEmpty, () => context.recycleBin.empty());

  // ---- attachments -----------------------------------------------
  h(IPC.attachmentsAdd, async (ticketId) => {
    const id = String(ticketId);
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const picked = await dialog.showOpenDialog(win, {
      title: 'Add attachments',
      properties: ['openFile', 'multiSelections'],
    });
    if (picked.canceled || picked.filePaths.length === 0) return context.tickets.get(id);
    let ticket = await context.tickets.get(id);
    for (const filePath of picked.filePaths) {
      ticket = await context.tickets.addAttachment(id, filePath);
    }
    return ticket;
  });
  h(IPC.attachmentsRemove, (ticketId, filename) =>
    context.tickets.removeAttachment(String(ticketId), String(filename)),
  );
  h(IPC.attachmentsOpen, async (ticketId, filename) => {
    const err = await shell.openPath(
      context.tickets.attachmentAbsPath(String(ticketId), String(filename)),
    );
    if (err) throw new Error(err);
  });
  h(IPC.attachmentsReveal, (ticketId, filename) => {
    shell.showItemInFolder(context.tickets.attachmentAbsPath(String(ticketId), String(filename)));
  });

  // ---- import / export -----------------------------------------
  h(IPC.ioExportTicket, async (ticketId) => {
    const id = String(ticketId);
    const ticket = await context.tickets.get(id);
    const withMedia = ticket.attachments.length > 0;
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const picked = await dialog.showSaveDialog(win, {
      title: `Export ${id}`,
      defaultPath: withMedia ? `${id}.zip` : `${id}.md`,
      filters: withMedia
        ? [{ name: 'Zip archive', extensions: ['zip'] }]
        : [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (picked.canceled || !picked.filePath) return false;
    await context.importExport.exportTickets([id], picked.filePath, { media: withMedia });
    return true;
  });
  h(IPC.ioExportProject, async (projectKey, opts) => {
    const key = String(projectKey);
    const media = Boolean((opts as { media?: unknown } | undefined)?.media);
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const picked = await dialog.showSaveDialog(win, {
      title: `Export project ${key}`,
      defaultPath: `${key}.zip`,
      filters: [{ name: 'Zip archive', extensions: ['zip'] }],
    });
    if (picked.canceled || !picked.filePath) return false;
    await context.importExport.exportProject(key, picked.filePath, { media });
    return true;
  });
  h(IPC.ioImport, async (targetProjectKey) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const picked = await dialog.showOpenDialog(win, {
      title: 'Import tickets',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Ticket or archive', extensions: ['md', 'zip'] }],
    });
    if (picked.canceled || picked.filePaths.length === 0) return [];
    return context.importExport.importFromFiles(picked.filePaths, String(targetProjectKey));
  });

  // ---- updates -------------------------------------------------------
  // checkForUpdate/downloadUpdate already resolve a Result themselves (they
  // need to distinguish "no update" from "error" internally), so register
  // them directly rather than through `h` to avoid double-wrapping.
  ipcMain.handle(IPC.updatesCheck, () => checkForUpdate());
  ipcMain.handle(IPC.updatesDownload, () => downloadUpdate());
  h(IPC.updatesInstall, () => installUpdate());

  // ---- Claude integration --------------------------------------------
  h(IPC.claudeDetect, () => claudeDetect());
  h(IPC.claudeConnect, (target) => claudeConnect(target as ClaudeTarget));
  h(IPC.claudeDisconnect, (target) => claudeDisconnect(target as ClaudeTarget));
}
