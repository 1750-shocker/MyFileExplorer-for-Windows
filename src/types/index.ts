import { MouseEvent } from 'react';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  lastModified?: Date;
  /** 该目录的子项是否已经加载（懒加载标记） */
  loaded?: boolean;
  /** 该目录是否有可见子项（用于决定是否显示展开箭头） */
  hasChildren?: boolean;
}

export interface FileTreeProps {
  node: FileNode;
  onFileClick: (filePath: string) => void;
  onDirectoryClick: (dirPath: string) => void;
  onRightClick?: (e: MouseEvent, node: FileNode) => void;
  onLoadChildren?: (dirPath: string) => Promise<FileNode[]>;
  refreshTarget?: { path: string; version: number } | null;
  level?: number;
  activePath?: string | null;
}
