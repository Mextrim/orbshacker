const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orbshacker', {
  call: (method, params = {}) => ipcRenderer.invoke('rpc:call', { method, params }),
  onEvent: (callback) => {
    const handler = (_event, data) => callback(data.event, data.data);
    ipcRenderer.on('rpc:event', handler);
    return () => ipcRenderer.removeListener('rpc:event', handler);
  },
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
});
