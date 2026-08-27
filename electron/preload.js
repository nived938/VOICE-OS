const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('voiceOS', {
  open: (target) => ipcRenderer.invoke('system:open', target),
  openPath: (target) => ipcRenderer.invoke('system:open-path', target),
  reveal: (target) => ipcRenderer.invoke('system:reveal', target),
  searchFiles: (query) => ipcRenderer.invoke('system:search-files', query),
  readFile: (target) => ipcRenderer.invoke('system:read-file', target),
  writeTextFile: (target, content) => ipcRenderer.invoke('system:write-text-file', target, content),
  clipboard: (text) => ipcRenderer.invoke('system:clipboard', text),
  power: (action) => ipcRenderer.invoke('system:power', action),
  aiPlan: (request) => ipcRenderer.invoke('ai:plan', request),
  home: process.env.USERPROFILE,
  devtools: () => ipcRenderer.invoke('app:toggle-devtools'),
  onHotkey: (callback) => ipcRenderer.on('voice:hotkey', callback)
});
