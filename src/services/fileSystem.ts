import { FileNode } from '../types';

type SearchResult = { name: string; path: string; type: string; dir: string };

interface FileSystemApi {
  openFile: (filePath: string) => Promise<boolean>;
  openInExplorer: (pathToOpen: string) => Promise<boolean>;
  getBlockRules: () => Promise<any>;
  addBlockExtension: (extension: string) => Promise<boolean>;
  addBlockPath: (filePath: string) => Promise<boolean>;
  removeBlockExtension: (extension: string) => Promise<boolean>;
  removeBlockPath: (filePath: string) => Promise<boolean>;
  getDirectoryChildren: (dirPath: string) => Promise<FileNode[]>;
  deletePath: (targetPath: string) => Promise<boolean>;
  searchFiles: (request: { dirPath: string; keyword: string; generation: number }) => Promise<SearchResult[]>;
  cancelSearch: (generation: number) => Promise<boolean>;
}

declare global {
  interface Window {
    fileSystemApi?: FileSystemApi;
  }
}

class FileSystemService {
  private api = window.fileSystemApi;

  async openFile(filePath: string): Promise<boolean> {
    if (!this.api) {
      console.error('File system API not available');
      return false;
    }

    try {
      const result = await this.api.openFile(filePath);
      return result;
    } catch (error) {
      console.error('Error opening file:', error);
      return false;
    }
  }

  // 在系统文件浏览器中打开文件或文件夹
  async openInExplorer(pathToOpen: string): Promise<boolean> {
    if (!this.api) {
      console.error('File system API not available');
      return false;
    }

    try {
      const result = await this.api.openInExplorer(pathToOpen);
      return result;
    } catch (error) {
      console.error('Error opening in explorer:', error);
      return false;
    }
  }

  // 获取屏蔽规则
  async getBlockRules(): Promise<any> {
    if (!this.api) {
      console.error('File system API not available');
      return { blockedExtensions: [], blockedPaths: [] };
    }

    try {
      const result = await this.api.getBlockRules();
      return result;
    } catch (error) {
      console.error('Error getting block rules:', error);
      return { blockedExtensions: [], blockedPaths: [] };
    }
  }

  // 添加屏蔽扩展名
  async addBlockExtension(extension: string): Promise<boolean> {
    if (!this.api) {
      console.error('File system API not available');
      return false;
    }

    try {
      const result = await this.api.addBlockExtension(extension);
      return result;
    } catch (error) {
      console.error('Error adding block extension:', error);
      return false;
    }
  }

  // 添加屏蔽路径
  async addBlockPath(filePath: string): Promise<boolean> {
    if (!this.api) {
      console.error('File system API not available');
      return false;
    }

    try {
      const result = await this.api.addBlockPath(filePath);
      return result;
    } catch (error) {
      console.error('Error adding block path:', error);
      return false;
    }
  }

  // 移除屏蔽扩展名
  async removeBlockExtension(extension: string): Promise<boolean> {
    if (!this.api) {
      console.error('File system API not available');
      return false;
    }

    try {
      const result = await this.api.removeBlockExtension(extension);
      return result;
    } catch (error) {
      console.error('Error removing block extension:', error);
      return false;
    }
  }

  // 移除屏蔽路径
  async removeBlockPath(filePath: string): Promise<boolean> {
    if (!this.api) {
      console.error('File system API not available');
      return false;
    }

    try {
      const result = await this.api.removeBlockPath(filePath);
      return result;
    } catch (error) {
      console.error('Error removing block path:', error);
      return false;
    }
  }

  // 懒加载：只获取目录的直接子项（不递归）
  async getDirectoryChildren(dirPath: string): Promise<FileNode[]> {
    if (!this.api) {
      console.error('File system API not available');
      return [];
    }

    try {
      const children = await this.api.getDirectoryChildren(dirPath);
      return children ?? [];
    } catch (error) {
      console.error('Error getting directory children:', error);
      return [];
    }
  }

  // 删除文件或文件夹
  async deletePath(targetPath: string): Promise<boolean> {
    if (!this.api) {
      console.error('File system API not available');
      return false;
    }

    try {
      const result = await this.api.deletePath(targetPath);
      return result;
    } catch (error) {
      console.error('Error deleting path:', error);
      return false;
    }
  }

  // 搜索文件
  async searchFiles(dirPath: string, keyword: string, generation: number): Promise<SearchResult[]> {
    if (!this.api) {
      console.error('File system API not available');
      return [];
    }

    try {
      const results = await this.api.searchFiles({ dirPath, keyword, generation });
      return results;
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  async cancelSearch(generation: number): Promise<boolean> {
    if (!this.api) {
      console.error('File system API not available');
      return false;
    }

    try {
      const result = await this.api.cancelSearch(generation);
      return result;
    } catch (error) {
      console.error('Error canceling search:', error);
      return false;
    }
  }
}

const fileSystemService = new FileSystemService();
export default fileSystemService;
