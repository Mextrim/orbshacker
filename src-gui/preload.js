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
  toggleMiniMode: () => ipcRenderer.invoke('window:toggle-mini-mode'),
  onMiniModeChange: (callback) => {
    const handler = (_event, isMini) => callback(isMini);
    ipcRenderer.on('window:mini-mode-changed', handler);
    return () => ipcRenderer.removeListener('window:mini-mode-changed', handler);
  },
  getAutoLaunch: () => ipcRenderer.invoke('app:get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('app:set-auto-launch', enabled),
  shutdownSystem: () => ipcRenderer.invoke('system:shutdown'),
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),
});
