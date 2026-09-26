import { contextBridge, ipcRenderer } from 'electron';

// Keep filesystem, SQLite, and Node.js in the main process.
contextBridge.exposeInMainWorld('studyVault', {
  tasks: { listActive: () => ipcRenderer.invoke('tasks:list-active') },
  sessions: {
    current: () => ipcRenderer.invoke('sessions:current'),
    start: (input) => ipcRenderer.invoke('sessions:start', input),
    pause: (id) => ipcRenderer.invoke('sessions:pause', id),
    resume: (id) => ipcRenderer.invoke('sessions:resume', id),
    complete: (id) => ipcRenderer.invoke('sessions:complete', id),
    cancel: (id) => ipcRenderer.invoke('sessions:cancel', id),
    history: () => ipcRenderer.invoke('sessions:history'),
    completeLinkedTask: (id) => ipcRenderer.invoke('sessions:complete-linked-task', id),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    chooseVault: () => ipcRenderer.invoke('settings:choose-vault'),
  },
  events: { retryAll: () => ipcRenderer.invoke('events:retry-all') },
});
