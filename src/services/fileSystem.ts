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

  // 获取屏蔽规则
  async getBlockRules(): Promise<any> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return { blockedExtensions: [], blockedPaths: [] };
    }

    try {
      const result = await this.ipcRenderer.invoke('get-block-rules');
      return result;
    } catch (error) {
      console.error('Error getting block rules:', error);
      return { blockedExtensions: [], blockedPaths: [] };
    }
  }

  // 添加屏蔽扩展名
  async addBlockExtension(extension: string): Promise<boolean> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return false;
    }

    try {
      const result = await this.ipcRenderer.invoke('add-block-extension', extension);
      return result;
    } catch (error) {
      console.error('Error adding block extension:', error);
      return false;
    }
  }

  // 添加屏蔽路径
  async addBlockPath(filePath: string): Promise<boolean> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return false;
    }

    try {
      const result = await this.ipcRenderer.invoke('add-block-path', filePath);
      return result;
    } catch (error) {
      console.error('Error adding block path:', error);
      return false;
    }
  }

  // 移除屏蔽扩展名
  async removeBlockExtension(extension: string): Promise<boolean> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return false;
    }

    try {
      const result = await this.ipcRenderer.invoke('remove-block-extension', extension);
      return result;
    } catch (error) {
      console.error('Error removing block extension:', error);
      return false;
    }
  }

  // 移除屏蔽路径
  async removeBlockPath(filePath: string): Promise<boolean> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return false;
    }

    try {
      const result = await this.ipcRenderer.invoke('remove-block-path', filePath);
      return result;
    } catch (error) {
      console.error('Error removing block path:', error);
      return false;
    }
  }

  // 懒加载：只获取目录的直接子项（不递归）
  async getDirectoryChildren(dirPath: string): Promise<FileNode[]> {
    if (!this.ipcRenderer) {
      console.error('Electron IPC not available');
      return [];
    }

    try {
      const children = await this.ipcRenderer.invoke('get-directory-children', dirPath);
      return children ?? [];
    } catch (error) {
      console.error('Error getting directory children:', error);
      return [];
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