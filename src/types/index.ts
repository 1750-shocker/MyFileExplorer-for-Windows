export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  lastModified?: Date;
}

export interface FileTreeProps {
  node: FileNode;
  onFileClick: (filePath: string) => void;
  onDirectoryClick: (dirPath: string) => void;
  level?: number;
}