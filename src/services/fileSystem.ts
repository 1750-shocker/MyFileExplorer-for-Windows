import { FileNode } from '../types';

declare global {
  interface Window {
    require: any;
  }
}

class FileSystemService {
  private ipcRenderer: any;

  constructor() {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      this.ipcRenderer = ipcRenderer;
    }
  }

  async getDirectoryTree(dirPath: string): Promise<FileNode | null> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return null;
    }

    try {
      const tree = await this.ipcRenderer.invoke('get-directory-tree', dirPath);
      return tree;
    } catch (error) {
      console.error('Error getting directory tree:', error);
      return null;
    }
  }

  async openFile(filePath: string): Promise<boolean> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return false;
    }

    try {
      const result = await this.ipcRenderer.invoke('open-file', filePath);
      return result;
    } catch (error) {
      console.error('Error opening file:', error);
      return false;
    }
  }

  // 在系统文件浏览器中打开文件或文件夹
  async openInExplorer(pathToOpen: string): Promise<boolean> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return false;
    }

    try {
      const result = await this.ipcRenderer.invoke('open-in-explorer', pathToOpen);
      return result;
    } catch (error) {
      console.error('Error opening in explorer:', error);
      return false;
    }
  }

  // 获取常用目录路径
  getCommonPaths(): string[] {
    const os = window.require?.('os');
    if (!os) return [];

    return [
      os.homedir(),
      `${os.homedir()}\\Documents`,
      `${os.homedir()}\\Desktop`,
      `${os.homedir()}\\Downloads`,
    ];
  }
}

const fileSystemService = new FileSystemService();
export default fileSystemService;