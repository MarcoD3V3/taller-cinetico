'use strict';
// Lo poco que la app de escritorio le cuenta al juego (y a la pantalla de inicio)
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('TC_DESKTOP', {
  offline: () => ipcRenderer.send('tc-offline'),
  online: () => ipcRenderer.send('tc-online'),
  fullscreen: () => ipcRenderer.send('tc-full'),
  info: () => ipcRenderer.invoke('tc-info'),
  onStatus: fn => ipcRenderer.on('tc-status', (e, s) => fn(s)),
});
