import React, { useState, useEffect } from 'react';
import fileSystemService from '../services/fileSystem';
import './BlockManager.css';

interface BlockManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onBlockRulesChanged: () => void;
}

interface BlockRules {
  blockedExtensions: string[];
  blockedPaths: string[];
}

const BlockManager: React.FC<BlockManagerProps> = ({ isOpen, onClose, onBlockRulesChanged }) => {
  const [blockRules, setBlockRules] = useState<BlockRules>({ blockedExtensions: [], blockedPaths: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBlockRules();
    }
  }, [isOpen]);

  const loadBlockRules = async () => {
    setLoading(true);
    try {
      const rules = await fileSystemService.getBlockRules();
      setBlockRules(rules);
    } catch (error) {
      console.error('Error loading block rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeBlockExtension = async (extension: string) => {
    const success = await fileSystemService.removeBlockExtension(extension);
    if (success) {
      await loadBlockRules();
      onBlockRulesChanged();
    }
  };

  const removeBlockPath = async (path: string) => {
    const success = await fileSystemService.removeBlockPath(path);
    if (success) {
      await loadBlockRules();
      onBlockRulesChanged();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="block-manager-overlay">
      <div className="block-manager">
        <div className="block-manager-header">
          <h3>屏蔽管理</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="block-manager-content">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <>
              <div className="block-section">
                <h4>已屏蔽的文件扩展名</h4>
                {blockRules.blockedExtensions.length === 0 ? (
                  <div className="empty-message">暂无屏蔽的扩展名</div>
                ) : (
                  <div className="block-list">
                    {blockRules.blockedExtensions.map((ext, index) => (
                      <div key={index} className="block-item">
                        <span className="block-text">
                          {ext === '.<数字后缀>' ? '所有数字后缀 (如 .001, .002)' : ext}
                        </span>
                        <button
                          className="unblock-button"
                          onClick={() => removeBlockExtension(ext)}
                          title="取消屏蔽"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="block-section">
                <h4>已屏蔽的文件/文件夹</h4>
                {blockRules.blockedPaths.length === 0 ? (
                  <div className="empty-message">暂无屏蔽的文件/文件夹</div>
                ) : (
                  <div className="block-list">
                    {blockRules.blockedPaths.map((path, index) => (
                      <div key={index} className="block-item">
                        <span className="block-text" title={path}>
                          {path.length > 50 ? '...' + path.slice(-47) : path}
                        </span>
                        <button
                          className="unblock-button"
                          onClick={() => removeBlockPath(path)}
                          title="取消屏蔽"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="block-manager-footer">
          <button className="primary-button" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};

export default BlockManager;