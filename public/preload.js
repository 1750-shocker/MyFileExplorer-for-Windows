const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileSystemApi', {
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  openInExplorer: (pathToOpen) => ipcRenderer.invoke('open-in-explorer', pathToOpen),
  getBlockRules: () => ipcRenderer.invoke('get-block-rules'),
  addBlockExtension: (extension) => ipcRenderer.invoke('add-block-extension', extension),
  addBlockPath: (filePath) => ipcRenderer.invoke('add-block-path', filePath),
  removeBlockExtension: (extension) => ipcRenderer.invoke('remove-block-extension', extension),
  removeBlockPath: (filePath) => ipcRenderer.invoke('remove-block-path', filePath),
  getDirectoryChildren: (dirPath) => ipcRenderer.invoke('get-directory-children', dirPath),
  deletePath: (targetPath) => ipcRenderer.invoke('delete-path', targetPath),
  searchFiles: (request) => ipcRenderer.invoke('search-files', request),
  cancelSearch: (generation) => ipcRenderer.invoke('cancel-search', generation)
});
