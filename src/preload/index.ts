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
    get: (id) => ipcRenderer.invoke(IPC.ticketsGet, id),
    create: (input) => ipcRenderer.invoke(IPC.ticketsCreate, input),
    update: (id, patch) => ipcRenderer.invoke(IPC.ticketsUpdate, id, patch),
    delete: (id) => ipcRenderer.invoke(IPC.ticketsDelete, id),
  },
  bin: {
    list: () => ipcRenderer.invoke(IPC.binList),
    restore: (id) => ipcRenderer.invoke(IPC.binRestore, id),
    purge: (id) => ipcRenderer.invoke(IPC.binPurge, id),
    empty: () => ipcRenderer.invoke(IPC.binEmpty),
  },
};

contextBridge.exposeInMainWorld('ptah', api);
