const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orbshacker', {
  call: (method, params = {}) => ipcRenderer.invoke('rpc:call', { method, params }),
  onEvent: (callback) => {
    const handler = (_event, data) => callback(data.event, data.data);
    ipcRenderer.on('rpc:event', handler);
    return () => ipcRenderer.removeListener('rpc:event', handler);
  },
  openDiscordQuests: () => ipcRenderer.invoke('open-discord-quests'),
  getDiscordProfile: () => ipcRenderer.invoke('discord:get-live-profile'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (params) => ipcRenderer.invoke('updater:download', params),
  onUpdateProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('updater:progress', handler);
    return () => ipcRenderer.removeListener('updater:progress', handler);
  },
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
