'use strict';
// Lo único que la página puede pedirle al programa (sin acceso libre al disco)
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rc', {
  state: () => ipcRenderer.invoke('state'),
  readImage: name => ipcRenderer.invoke('read-image', name),
  loadMeta: name => ipcRenderer.invoke('load-meta', name),
  saveMeta: (sheet, meta) => ipcRenderer.invoke('save-meta', sheet, meta),
  chooseIn: () => ipcRenderer.invoke('choose-in'),
  resetIn: () => ipcRenderer.invoke('reset-in'),
  chooseOut: () => ipcRenderer.invoke('choose-out'),
  openFolder: (which, target) => ipcRenderer.invoke('open-folder', which, target),
  addImages: () => ipcRenderer.invoke('add-images'),
  saveDropped: (name, dataUrl) => ipcRenderer.invoke('save-dropped', name, dataUrl),
  exportSprites: job => ipcRenderer.invoke('export', job),
  onFolderChanged: fn => ipcRenderer.on('folder-changed', (e, d) => fn(d)),
});
