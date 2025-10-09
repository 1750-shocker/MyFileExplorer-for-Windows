import React, { useState } from 'react';
import { FileTreeProps } from '../types';
import './FileTree.css';

const FileTree: React.FC<FileTreeProps> = ({ 
  node, 
  onFileClick, 
  onDirectoryClick, 
  onRightClick,
  level = 0 
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // 默认展开前两层

  const handleClick = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
      onDirectoryClick(node.path);
    } else {
      onFileClick(node.path);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (onRightClick) {
      onRightClick(e, node);
    }
  };

  const getIcon = () => {
    if (node.type === 'directory') {
      return isExpanded ? '📂' : '📁';
    }
    
    // 根据文件扩展名返回不同图标
    const ext = node.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md':
        return '📝';
      case 'txt':
        return '📄';
      case 'json':
        return '⚙️';
      case 'js':
      case 'ts':
        return '📜';
      case 'html':
        return '🌐';
      case 'css':
        return '🎨';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="file-tree-node">
      <div 
        className={`file-tree-item ${node.type}`}
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        <span className="file-icon">{getIcon()}</span>
        <span className="file-name">{node.name}</span>
        {node.type === 'file' && (
          <span className="file-size">{formatFileSize(node.size)}</span>
        )}
      </div>
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div className="file-tree-children">
          {node.children.map((child, index) => (
            <FileTree
              key={`${child.path}-${index}`}
              node={child}
              onFileClick={onFileClick}
              onDirectoryClick={onDirectoryClick}
              onRightClick={onRightClick}
              level={level + 1}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default FileTree;