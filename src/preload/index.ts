import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type PtahApi } from '@shared/ipc';

/**
 * The only bridge between renderer and main. Exposes a typed `window.ptah`
 * object; the renderer never sees `ipcRenderer` or Node APIs directly.
 */
const api: PtahApi = {
  config: {
    get: () => ipcRenderer.invoke(IPC.configGet),
    setTheme: (theme) => ipcRenderer.invoke(IPC.configSetTheme, theme),
    setDataDir: (dir) => ipcRenderer.invoke(IPC.configSetDataDir, dir),
    setDefaultProjectName: (name) => ipcRenderer.invoke(IPC.configSetDefaultProjectName, name),
    pickDataDir: () => ipcRenderer.invoke(IPC.configPickDataDir),
  },
  projects: {
    list: () => ipcRenderer.invoke(IPC.projectsList),
    create: (input) => ipcRenderer.invoke(IPC.projectsCreate, input),
    rename: (key, name) => ipcRenderer.invoke(IPC.projectsRename, key, name),
    delete: (key) => ipcRenderer.invoke(IPC.projectsDelete, key),
  },
  tickets: {
    list: (projectKey) => ipcRenderer.invoke(IPC.ticketsList, projectKey),
    listChildren: (id) => ipcRenderer.invoke(IPC.ticketsListChildren, id),
    get: (id) => ipcRenderer.invoke(IPC.ticketsGet, id),
    create: (input) => ipcRenderer.invoke(IPC.ticketsCreate, input),
    update: (id, patch) => ipcRenderer.invoke(IPC.ticketsUpdate, id, patch),
    changeProject: (id, projectKey) => ipcRenderer.invoke(IPC.ticketsChangeProject, id, projectKey),
    delete: (id) => ipcRenderer.invoke(IPC.ticketsDelete, id),
  },
  bin: {
    list: () => ipcRenderer.invoke(IPC.binList),
    restore: (id) => ipcRenderer.invoke(IPC.binRestore, id),
    purge: (id) => ipcRenderer.invoke(IPC.binPurge, id),
    empty: () => ipcRenderer.invoke(IPC.binEmpty),
  },
  attachments: {
    add: (ticketId) => ipcRenderer.invoke(IPC.attachmentsAdd, ticketId),
    remove: (ticketId, filename) => ipcRenderer.invoke(IPC.attachmentsRemove, ticketId, filename),
    open: (ticketId, filename) => ipcRenderer.invoke(IPC.attachmentsOpen, ticketId, filename),
    reveal: (ticketId, filename) => ipcRenderer.invoke(IPC.attachmentsReveal, ticketId, filename),
  },
  io: {
    exportTicket: (ticketId) => ipcRenderer.invoke(IPC.ioExportTicket, ticketId),
    exportProject: (projectKey, opts) => ipcRenderer.invoke(IPC.ioExportProject, projectKey, opts),
    import: (targetProjectKey) => ipcRenderer.invoke(IPC.ioImport, targetProjectKey),
  },
  system: {
    openExternal: (url) => ipcRenderer.invoke(IPC.systemOpenExternal, url),
  },
  updates: {
    check: () => ipcRenderer.invoke(IPC.updatesCheck),
    download: () => ipcRenderer.invoke(IPC.updatesDownload),
    install: () => ipcRenderer.invoke(IPC.updatesInstall),
  },
  claude: {
    detect: () => ipcRenderer.invoke(IPC.claudeDetect),
    connect: (target) => ipcRenderer.invoke(IPC.claudeConnect, target),
    disconnect: (target) => ipcRenderer.invoke(IPC.claudeDisconnect, target),
  },
};

contextBridge.exposeInMainWorld('ptah', api);
