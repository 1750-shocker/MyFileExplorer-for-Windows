import React, { useState, useEffect, useRef } from 'react';
import FileTree from './components/FileTree';
import BlockManager from './components/BlockManager';
import fileSystemService from './services/fileSystem';
import { FileNode } from './types';
import './App.css';

interface FavoriteItem {
  path: string;
  name?: string;
}

const App: React.FC = () => {
  const [currentTree, setCurrentTree] = useState<FileNode | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [showRenameDialog, setShowRenameDialog] = useState<boolean>(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [contextMenuTarget, setContextMenuTarget] = useState<string | null>(null);
  const [contextMenuNode, setContextMenuNode] = useState<FileNode | null>(null);
  const [showBlockManager, setShowBlockManager] = useState<boolean>(false);
  const [refreshTarget, setRefreshTarget] = useState<{ path: string; version: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);
  
  const [activePath, setActivePath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{name: string, path: string, type: string, dir: string}>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1);
  
  // 拖拽排序状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 用于记录鼠标在弹窗外部按下和抬起的位置，防止选中文字拖拽时误触关闭
  const modalMouseDownPos = useRef<{ x: number; y: number } | null>(null);

  // 用于竞态保护的请求 ID，防止旧的异步请求覆盖最新结果
  const loadIdRef = useRef(0);
  const searchTimerRef = useRef<number | null>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // 初始化时只加载收藏夹，不自动加载任何目录
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('pathFavorites');
    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites);
        if (Array.isArray(parsed)) {
          // 兼容旧的 string[] 数据
          const migrated: FavoriteItem[] = parsed.map(item => {
            if (typeof item === 'string') {
              return { path: item };
            }
            return item;
          });
          setFavorites(migrated);
        }
      } catch (e) {
        console.error('Failed to parse favorites', e);
      }
    }
  };

  const saveFavorites = (newFavorites: FavoriteItem[]) => {
    localStorage.setItem('pathFavorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  };

  const addToFavorites = () => {
    if (currentPath && !favorites.find(fav => fav.path === currentPath)) {
      const newFavorites = [...favorites, { path: currentPath }];
      saveFavorites(newFavorites);
    }
  };

  const removeFromFavorites = (path: string) => {
    const newFavorites = favorites.filter(fav => fav.path !== path);
    saveFavorites(newFavorites);
  };

  const handleFavoriteClick = (path: string) => {
    loadDirectory(path);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    // 设置拖拽效果，让其半透明等
    e.dataTransfer.effectAllowed = 'move';
    // 需要设置数据才能触发拖拽，即使数据不使用
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      const newFavorites = [...favorites];
      const [draggedItem] = newFavorites.splice(draggedIndex, 1);
      newFavorites.splice(targetIndex, 0, draggedItem);
      saveFavorites(newFavorites);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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

  const getParentPath = (filePath: string): string => {
    const parts = filePath.split('\\');
    if (parts.length <= 1) return filePath;
    parts.pop();
    return parts.join('\\');
  };

  const handleContextMenuAction = async (action: string) => {
    if (action === 'delete' && contextMenuTarget) {
      removeFromFavorites(contextMenuTarget);
    } else if (action === 'rename' && contextMenuTarget) {
      setRenameTarget(contextMenuTarget);
      const targetFav = favorites.find(f => f.path === contextMenuTarget);
      setRenameInput(targetFav?.name || contextMenuTarget.split('\\').pop() || contextMenuTarget);
      setShowRenameDialog(true);
    } else if (action === 'refresh' && contextMenuNode) {
      const targetPath = contextMenuNode.type === 'directory'
        ? contextMenuNode.path
        : getParentPath(contextMenuNode.path);
      setRefreshTarget(prev => ({ path: targetPath, version: (prev?.version ?? 0) + 1 }));
    } else if (action === 'deleteFile' && contextMenuNode) {
      setDeleteTarget(contextMenuNode);
      setShowDeleteConfirm(true);
    } else if (action === 'copyPath' && contextMenuNode) {
      await navigator.clipboard.writeText(contextMenuNode.path);
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

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameTarget) {
      const newFavorites = favorites.map(fav => 
        fav.path === renameTarget ? { ...fav, name: renameInput.trim() } : fav
      );
      saveFavorites(newFavorites);
    }
    setShowRenameDialog(false);
    setRenameTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setShowDeleteConfirm(false);

    const parentPath = getParentPath(deleteTarget.path);
    const success = await fileSystemService.deletePath(deleteTarget.path);

    if (success) {
      if (deleteTarget.path === currentPath) {
        // 删除的是根目录本身，清空视图
        setCurrentTree(null);
        setCurrentPath('');
      } else {
        // 刷新父目录以更新显示
        setRefreshTarget(prev => ({ path: parentPath, version: (prev?.version ?? 0) + 1 }));
      }
    } else {
      setError('删除失败');
    }
    setDeleteTarget(null);
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
    // 竞态保护：记录本次请求的 ID，若后续有新请求则忽略旧结果
    loadIdRef.current += 1;
    const currentLoadId = loadIdRef.current;

    setLoading(true);
    setError('');

    try {
      // 只读取根目录的直接子项（懒加载模式，不递归）
      const children = await fileSystemService.getDirectoryChildren(dirPath);
      // 只处理最新一次请求的结果
      if (currentLoadId !== loadIdRef.current) return;

      // 构建根节点，子项已加载
      const rootNode: FileNode = {
        name: dirPath.split('\\').pop() || dirPath,
        path: dirPath,
        type: 'directory',
        children,
        loaded: true,
        hasChildren: children.length > 0
      };

      setCurrentTree(rootNode);
      setCurrentPath(dirPath);
    } catch (err) {
      if (currentLoadId !== loadIdRef.current) return;
      setError('加载目录时出错');
      console.error(err);
    } finally {
      if (currentLoadId === loadIdRef.current) {
        setLoading(false);
      }
    }
  };

  // 懒加载回调：FileTree 展开子目录时调用
  const handleLoadChildren = async (dirPath: string): Promise<FileNode[]> => {
    return await fileSystemService.getDirectoryChildren(dirPath);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedResultIndex(-1);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!value.trim() || !currentPath) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = window.setTimeout(async () => {
      setIsSearching(true);
      setShowSearchResults(true);
      const results = await fileSystemService.searchFiles(currentPath, value.trim());
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedResultIndex >= 0 && searchResults.length > 0) {
      handleSearchResultClick(searchResults[selectedResultIndex].path);
      return;
    }
    if (!searchQuery.trim() || !currentPath) return;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    setIsSearching(true);
    setShowSearchResults(true);
    const results = await fileSystemService.searchFiles(currentPath, searchQuery.trim());
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSearchResultClick = (resultPath: string) => {
    setActivePath(resultPath);
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResultIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchResults || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(prev =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
      e.preventDefault();
      handleSearchResultClick(searchResults[selectedResultIndex].path);
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
    }
  };

  const clearSearch = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setActivePath(null);
    setSelectedResultIndex(-1);
  };

  const highlightMatch = (text: string, keyword: string): React.ReactNode => {
    if (!keyword) return text;
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <span className="search-highlight">{text.slice(index, index + keyword.length)}</span>
        {text.slice(index + keyword.length)}
      </>
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedResultIndex >= 0 && searchResultsRef.current) {
      const items = searchResultsRef.current.querySelectorAll('.search-result-item');
      items[selectedResultIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedResultIndex]);



  const handleModalMouseDown = (e: React.MouseEvent) => {
    modalMouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleModalMouseUp = (e: React.MouseEvent, closeAction: () => void) => {
    if (!modalMouseDownPos.current) return;
    
    const dx = Math.abs(e.clientX - modalMouseDownPos.current.x);
    const dy = Math.abs(e.clientY - modalMouseDownPos.current.y);
    
    // 如果鼠标移动距离小于 5 像素，认为是点击操作；否则认为是拖拽选中文本操作
    if (dx < 5 && dy < 5) {
      closeAction();
    }
    
    modalMouseDownPos.current = null;
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
            disabled={!currentPath || favorites.some(fav => fav.path === currentPath)}
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
        <form onSubmit={handleSearchSubmit} className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="搜索文件名..."
              className="path-input search-input"
              disabled={!currentPath}
            />
            {searchQuery && (
              <button type="button" className="search-clear-btn" onClick={clearSearch} title="清除搜索">×</button>
            )}
          </div>
          <button type="submit" className="path-button" disabled={!currentPath || isSearching}>
            {isSearching ? '搜索中...' : '搜索'}
          </button>
          {showSearchResults && (
            <div className="search-results-dropdown" ref={searchResultsRef}>
              {isSearching ? (
                <div className="search-results-header">搜索中...</div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="search-results-header">
                    找到 {searchResults.length >= 100 ? '100+' : searchResults.length} 个结果
                  </div>
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`search-result-item ${idx === selectedResultIndex ? 'selected' : ''}`}
                      onClick={() => handleSearchResultClick(result.path)}
                      onMouseEnter={() => setSelectedResultIndex(idx)}
                    >
                      <span className="file-icon">{result.type === 'directory' ? '📁' : '📄'}</span>
                      <div className="search-result-content">
                        <span className="file-name">{highlightMatch(result.name, searchQuery)}</span>
                        <div className="file-path-hint">
                          {result.dir.replace(currentPath, '') || '\\'}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="search-results-header">未找到匹配项</div>
              )}
            </div>
          )}
        </form>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <h3>收藏夹</h3>
          <div className="favorites">
            {favorites.length === 0 ? (
              <div className="no-favorites">暂无收藏</div>
            ) : (
              favorites.map((fav, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`favorite-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                  onClick={() => handleFavoriteClick(fav.path)}
                  onContextMenu={(e) => handleRightClick(e, fav.path)}
                  title={fav.path}
                >
                  📁 {fav.name || fav.path.split('\\').pop() || fav.path}
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
                key={currentTree.path}
                node={currentTree}
                onFileClick={handleFileClick}
                onDirectoryClick={handleDirectoryClick}
                onRightClick={handleFileTreeRightClick}
                onLoadChildren={handleLoadChildren}
                refreshTarget={refreshTarget}
                activePath={activePath}
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
            <>
              <div
                className="context-menu-item"
                onClick={() => handleContextMenuAction('rename')}
              >
                ✏️ 修改名称
              </div>
              <div
                className="context-menu-item"
                onClick={() => handleContextMenuAction('delete')}
              >
                🗑️ 删除收藏
              </div>
            </>
          )}
          {contextMenuNode && (
            <>
              <div
                className="context-menu-item"
                onClick={() => handleContextMenuAction('refresh')}
              >
                🔄 刷新
              </div>
              <div
                className="context-menu-item"
                onClick={() => handleContextMenuAction('openInExplorer')}
              >
                📂 在文件浏览器中打开
              </div>
              <div
                className="context-menu-item"
                onClick={() => handleContextMenuAction('copyPath')}
              >
                📋 复制绝对路径
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
              <div className="context-menu-divider" />
              <div
                className="context-menu-item context-menu-item-danger"
                onClick={() => handleContextMenuAction('deleteFile')}
              >
                🗑️ 删除{contextMenuNode.type === 'directory' ? '文件夹' : '文件'}
              </div>
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

      {/* 删除确认对话框 */}
      {showDeleteConfirm && deleteTarget && (
        <div 
          className="modal-overlay" 
          onMouseDown={handleModalMouseDown}
          onMouseUp={(e) => handleModalMouseUp(e, () => setShowDeleteConfirm(false))}
        >
          <div 
            className="modal-dialog" 
            onMouseDown={e => e.stopPropagation()} 
            onMouseUp={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="modal-title">确认删除</h3>
            <p className="modal-body">
              确定要删除 <strong>"{deleteTarget.name}"</strong> 吗？
              {deleteTarget.type === 'directory' && ' 这将删除文件夹内所有内容。'}
              <br />此操作不可撤销。
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>取消</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 修改名称对话框 */}
      {showRenameDialog && renameTarget && (
        <div 
          className="modal-overlay" 
          onMouseDown={handleModalMouseDown}
          onMouseUp={(e) => handleModalMouseUp(e, () => setShowRenameDialog(false))}
        >
          <div 
            className="modal-dialog" 
            onMouseDown={e => e.stopPropagation()} 
            onMouseUp={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="modal-title">修改收藏显示名称</h3>
            <form onSubmit={handleRenameSubmit}>
              <div className="modal-body" style={{ margin: '16px 0' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666', wordBreak: 'break-all' }}>
                  路径: {renameTarget}
                </p>
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="输入新的显示名称"
                  autoFocus
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowRenameDialog(false)}>取消</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>确定</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;