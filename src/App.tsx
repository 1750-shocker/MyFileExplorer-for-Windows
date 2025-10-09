import React, { useState, useEffect } from 'react';
import FileTree from './components/FileTree';
import BlockManager from './components/BlockManager';
import fileSystemService from './services/fileSystem';
import { FileNode } from './types';
import './App.css';

const App: React.FC = () => {
  const [currentTree, setCurrentTree] = useState<FileNode | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [contextMenuTarget, setContextMenuTarget] = useState<string | null>(null);
  const [contextMenuNode, setContextMenuNode] = useState<FileNode | null>(null);
  const [showBlockManager, setShowBlockManager] = useState<boolean>(false);

  // 初始化时加载用户主目录
  useEffect(() => {
    const initPath = fileSystemService.getCommonPaths()[0];
    if (initPath) {
      loadDirectory(initPath);
    }
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('pathFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  };

  const saveFavorites = (newFavorites: string[]) => {
    localStorage.setItem('pathFavorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  };

  const addToFavorites = () => {
    if (currentPath && !favorites.includes(currentPath)) {
      const newFavorites = [...favorites, currentPath];
      saveFavorites(newFavorites);
    }
  };

  const removeFromFavorites = (path: string) => {
    const newFavorites = favorites.filter(fav => fav !== path);
    saveFavorites(newFavorites);
  };

  const handleFavoriteClick = (path: string) => {
    loadDirectory(path);
  };

  const handleRightClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    
    // 计算菜单位置，确保不会超出屏幕
    const menuWidth = 200;
    const menuHeight = 50;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // 检查右边界
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // 检查下边界
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    // 确保不会超出左上边界
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setContextMenuPosition({ x, y });
    setContextMenuTarget(path);
    setShowContextMenu(true);
  };

  const handleFileTreeRightClick = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 计算菜单位置，确保不会超出屏幕
    const menuWidth = 250; // 预估菜单宽度
    const menuHeight = node.type === 'file' && node.name.includes('.') ? 120 : 80; // 预估菜单高度
    
    let x = e.clientX;
    let y = e.clientY;
    
    // 检查右边界
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // 检查下边界
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    // 确保不会超出左上边界
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setContextMenuPosition({ x, y });
    setContextMenuNode(node);
    setContextMenuTarget(null); // 清除收藏夹的右键菜单目标
    setShowContextMenu(true);
  };

  const handleContextMenuAction = async (action: string) => {
    if (action === 'delete' && contextMenuTarget) {
      removeFromFavorites(contextMenuTarget);
    } else if (action === 'openInExplorer' && contextMenuNode) {
      const success = await fileSystemService.openInExplorer(contextMenuNode.path);
      if (!success) {
        console.error('Failed to open in explorer');
      }
    } else if (action === 'blockFile' && contextMenuNode) {
      // 屏蔽该文件/文件夹
      const success = await fileSystemService.addBlockPath(contextMenuNode.path);
      if (success) {
        console.log(`已屏蔽: ${contextMenuNode.path}`);
        // 重新加载当前目录以更新显示
        if (currentPath) {
          loadDirectory(currentPath);
        }
      } else {
        setError('屏蔽失败');
      }
    } else if (action === 'blockExtension' && contextMenuNode && contextMenuNode.type === 'file') {
      // 屏蔽该类型文件
      const fileName = contextMenuNode.name;
      const extension = fileName.includes('.') ? '.' + fileName.split('.').pop()?.toLowerCase() : '';
      
      if (extension) {
        const success = await fileSystemService.addBlockExtension(extension);
        if (success) {
          console.log(`已屏蔽扩展名: ${extension}`);
          // 重新加载当前目录以更新显示
          if (currentPath) {
            loadDirectory(currentPath);
          }
        } else {
          setError('屏蔽扩展名失败');
        }
      }
    }
    setShowContextMenu(false);
    setContextMenuTarget(null);
    setContextMenuNode(null);
  };

  const handleBlockRulesChanged = () => {
    // 当屏蔽规则改变时，重新加载当前目录
    if (currentPath) {
      loadDirectory(currentPath);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
      setContextMenuTarget(null);
      setContextMenuNode(null);
    };
    
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const loadDirectory = async (dirPath: string) => {
    setLoading(true);
    setError('');
    
    try {
      const tree = await fileSystemService.getDirectoryTree(dirPath);
      if (tree) {
        setCurrentTree(tree);
        setCurrentPath(dirPath);
      } else {
        setError('无法读取目录');
      }
    } catch (err) {
      setError('加载目录时出错');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (filePath: string) => {
    console.log('Opening file:', filePath);
    const success = await fileSystemService.openFile(filePath);
    if (!success) {
      setError('无法打开文件');
    }
  };

  const handleDirectoryClick = (dirPath: string) => {
    console.log('Directory clicked:', dirPath);
    // 这里可以添加目录点击的额外逻辑
  };

  const handlePathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPath(event.target.value);
  };

  const handlePathSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (currentPath.trim()) {
      loadDirectory(currentPath.trim());
    }
  };



  return (
    <div className="app">
      <header className="app-header">
        <h1>📁 MyNoteExplorer</h1>
        <form onSubmit={handlePathSubmit} className="path-form">
          <button 
            type="button"
            onClick={addToFavorites} 
            className="favorite-button"
            title="收藏当前路径"
            disabled={!currentPath || favorites.includes(currentPath)}
          >
            ⭐
          </button>
          <input
            type="text"
            value={currentPath}
            onChange={handlePathChange}
            placeholder="输入文件夹路径..."
            className="path-input"
          />
          <button type="submit" className="path-button">浏览</button>
          <button 
            type="button"
            onClick={() => setShowBlockManager(true)}
            className="block-manager-button"
            title="屏蔽管理"
          >
            🚫
          </button>
        </form>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <h3>收藏夹</h3>
          <div className="favorites">
            {favorites.length === 0 ? (
              <div className="no-favorites">暂无收藏</div>
            ) : (
              favorites.map((path, index) => (
                <div
                  key={index}
                  className="favorite-item"
                  onClick={() => handleFavoriteClick(path)}
                  onContextMenu={(e) => handleRightClick(e, path)}
                  title={path}
                >
                  📁 {path.split('\\').pop() || path}
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="main-content">
          {loading && <div className="loading">加载中...</div>}
          {error && <div className="error">错误: {error}</div>}
          {currentTree && !loading && (
            <div className="file-tree-container">
              <FileTree
                node={currentTree}
                onFileClick={handleFileClick}
                onDirectoryClick={handleDirectoryClick}
                onRightClick={handleFileTreeRightClick}
              />
            </div>
          )}
        </main>
      </div>

      {/* 右键菜单 */}
      {showContextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 1000
          }}
        >
          {contextMenuTarget && (
            <div
              className="context-menu-item"
              onClick={() => handleContextMenuAction('delete')}
            >
              🗑️ 删除收藏
            </div>
          )}
          {contextMenuNode && (
            <>
              <div
                className="context-menu-item"
                onClick={() => handleContextMenuAction('openInExplorer')}
              >
                📂 在文件浏览器中打开
              </div>
              <div
                className="context-menu-item"
                onClick={() => handleContextMenuAction('blockFile')}
              >
                🚫 屏蔽{contextMenuNode.type === 'directory' ? '该文件夹' : '该文件'}
              </div>
              {contextMenuNode.type === 'file' && contextMenuNode.name.includes('.') && (
                <div
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('blockExtension')}
                >
                  🚫 屏蔽该类型文件 (.{contextMenuNode.name.split('.').pop()})
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 屏蔽管理器 */}
      <BlockManager
        isOpen={showBlockManager}
        onClose={() => setShowBlockManager(false)}
        onBlockRulesChanged={handleBlockRulesChanged}
      />
    </div>
  );
};

export default App;