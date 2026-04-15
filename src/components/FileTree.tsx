import React, { useState } from 'react';
import { FileNode, FileTreeProps } from '../types';
import './FileTree.css';

const FileTree: React.FC<FileTreeProps> = ({
  node,
  onFileClick,
  onDirectoryClick,
  onRightClick,
  onLoadChildren,
  level = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[]>(node.children ?? []);
  const [loaded, setLoaded] = useState<boolean>(node.loaded ?? false);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const handleClick = async () => {
    if (node.type === 'directory') {
      const nextExpanded = !isExpanded;
      setIsExpanded(nextExpanded);
      onDirectoryClick(node.path);

      // 展开且尚未加载子项时，触发懒加载
      if (nextExpanded && !loaded && onLoadChildren) {
        setLoadingChildren(true);
        try {
          const result = await onLoadChildren(node.path);
          setChildren(result);
          setLoaded(true);
        } finally {
          setLoadingChildren(false);
        }
      }
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

  // 是否显示展开箭头：目录本身 hasChildren 为 true，或已加载到子项
  const showExpandArrow =
    node.type === 'directory' && (node.hasChildren || children.length > 0);

  return (
    <div className="file-tree-node">
      <div
        className={`file-tree-item ${node.type}`}
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        {/* 展开箭头占位，保持对齐 */}
        <span className="expand-arrow">
          {node.type === 'directory'
            ? showExpandArrow
              ? isExpanded ? '▾' : '▸'
              : ' '
            : ' '}
        </span>
        <span className="file-icon">{getIcon()}</span>
        <span className="file-name">{node.name}</span>
        {loadingChildren && <span className="loading-indicator"> ⏳</span>}
        {node.type === 'file' && (
          <span className="file-size">{formatFileSize(node.size)}</span>
        )}
      </div>

      {node.type === 'directory' && isExpanded && (
        <div className="file-tree-children">
          {children.map((child, index) => (
            <FileTree
              key={`${child.path}-${index}`}
              node={child}
              onFileClick={onFileClick}
              onDirectoryClick={onDirectoryClick}
              onRightClick={onRightClick}
              onLoadChildren={onLoadChildren}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileTree;
