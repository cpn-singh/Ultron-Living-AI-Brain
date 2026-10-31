const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  openExternal: (url) => ipcRenderer.send('open-external', url),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  launchDesktopApp: (appName) => ipcRenderer.invoke('launch-desktop-app', appName),
  desktopListFiles: () => ipcRenderer.invoke('desktop-list-files'),
  desktopCreateFile: (payload) => ipcRenderer.invoke('desktop-create-file', payload),
  desktopOpenFile: (path) => ipcRenderer.invoke('desktop-open-file', path),
});
