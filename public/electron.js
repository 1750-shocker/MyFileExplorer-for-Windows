const { app, BrowserWindow, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,  // 隐藏菜单栏
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon:path.join(__dirname, '../build/favicon.ico')
  });

  // 完全移除应用菜单
  Menu.setApplicationMenu(null);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  // F12 在任意模式下均可打开 DevTools，方便调试
  globalShortcut.register('F12', () => {
    mainWindow.webContents.toggleDevTools();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 屏蔽规则存储路径
const getBlockRulesPath = () => {
  return path.join(os.homedir(), '.myfileexplorer-block-rules.json');
};

// 加载屏蔽规则
const loadBlockRules = () => {
  try {
    const rulesPath = getBlockRulesPath();
    if (fs.existsSync(rulesPath)) {
      const data = fs.readFileSync(rulesPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading block rules:', error);
  }
  return {
    blockedExtensions: [],
    blockedPaths: []
  };
};

// 保存屏蔽规则
const saveBlockRules = (rules) => {
  try {
    const rulesPath = getBlockRulesPath();
    fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving block rules:', error);
    return false;
  }
};

// 检查文件是否被屏蔽
const isBlocked = (filePath, fileName, rules) => {
  // 检查路径是否被屏蔽
  if (rules.blockedPaths.includes(filePath)) {
    return true;
  }
  
  // 检查文件扩展名是否被屏蔽
  const ext = path.extname(fileName).toLowerCase();
  if (ext && rules.blockedExtensions.includes(ext)) {
    return true;
  }
  
  // 检查是否包含特殊规则：屏蔽所有数字后缀（如 .001, .002）
  if (ext && /^\.\d+$/.test(ext) && rules.blockedExtensions.includes('.<数字后缀>')) {
    return true;
  }
  
  return false;
};

// IPC handlers for file system operations
ipcMain.handle('get-directory-tree', async (event, dirPath) => {
  try {
    return await getDirectoryTree(dirPath);
  } catch (error) {
    console.error('Error reading directory:', error);
    return null;
  }
});

// 只读取目录的直接子项（不递归），用于懒加载
ipcMain.handle('get-directory-children', async (event, dirPath) => {
  try {
    return await getDirectoryChildren(dirPath);
  } catch (error) {
    console.error('Error reading directory children:', error);
    return null;
  }
});

ipcMain.handle('search-files', async (event, { dirPath, keyword }) => {
  try {
    return await searchFiles(dirPath, keyword.toLowerCase());
  } catch (error) {
    console.error('Error searching files:', error);
    return [];
  }
});

async function searchFiles(dirPath, keyword) {
  const rules = loadBlockRules();
  const results = [];
  const maxResults = 100; // 限制最多结果数，防止卡死

  async function walk(currentPath) {
    if (results.length >= maxResults) return;
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        const entryPath = path.join(currentPath, entry.name);
        
        // 检查是否被屏蔽
        if (isBlocked(entryPath, entry.name, rules)) continue;
        if (entry.name.endsWith('.assets')) continue;
        
        if (entry.name.toLowerCase().includes(keyword)) {
          results.push({
            name: entry.name,
            path: entryPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            dir: currentPath
          });
        }
        
        if (entry.isDirectory()) {
          await walk(entryPath);
        }
      }
    } catch (error) {
      console.warn(`Skipping ${currentPath}:`, error.message);
    }
  }

  await walk(dirPath);
  return results;
}

// IPC handlers for block rules
ipcMain.handle('get-block-rules', async () => {
  return loadBlockRules();
});

ipcMain.handle('add-block-extension', async (event, extension) => {
  const rules = loadBlockRules();
  if (!rules.blockedExtensions.includes(extension)) {
    rules.blockedExtensions.push(extension);
    return saveBlockRules(rules);
  }
  return true;
});

ipcMain.handle('add-block-path', async (event, filePath) => {
  const rules = loadBlockRules();
  if (!rules.blockedPaths.includes(filePath)) {
    rules.blockedPaths.push(filePath);
    return saveBlockRules(rules);
  }
  return true;
});

ipcMain.handle('remove-block-extension', async (event, extension) => {
  const rules = loadBlockRules();
  rules.blockedExtensions = rules.blockedExtensions.filter(ext => ext !== extension);
  return saveBlockRules(rules);
});

ipcMain.handle('remove-block-path', async (event, filePath) => {
  const rules = loadBlockRules();
  rules.blockedPaths = rules.blockedPaths.filter(path => path !== filePath);
  return saveBlockRules(rules);
});

ipcMain.handle('open-file', async (event, filePath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return true;
  } catch (error) {
    console.error('Error opening file:', error);
    return false;
  }
});

ipcMain.handle('delete-path', async (event, targetPath) => {
  try {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error('Error deleting path:', error);
    return false;
  }
});

ipcMain.handle('open-in-explorer', async (event, pathToOpen) => {
  try {
    const { shell } = require('electron');
    // 在Windows上，使用shell.showItemInFolder来在文件浏览器中显示文件/文件夹
    shell.showItemInFolder(pathToOpen);
    return true;
  } catch (error) {
    console.error('Error opening in explorer:', error);
    return false;
  }
});

// 只读取目录的直接子项（不递归），每个子项若是目录则标记 hasChildren
async function getDirectoryChildren(dirPath) {
  const rules = loadBlockRules();
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const children = [];

    for (const entry of entries) {
      const childPath = path.join(dirPath, entry.name);

      // 检查是否被屏蔽
      if (isBlocked(childPath, entry.name, rules)) {
        continue;
      }
      // 屏蔽 .assets 后缀的文件夹
      if (entry.name.endsWith('.assets')) {
        continue;
      }

      // 优先用 Dirent 自带的类型信息，避免 stat 失败导致条目丢失
      const isDir = entry.isDirectory() || entry.isSymbolicLink() && await (async () => {
        try { return (await fs.promises.stat(childPath)).isDirectory(); } catch { return false; }
      })();

      let size = 0;
      let lastModified = new Date();
      try {
        const stats = await fs.promises.lstat(childPath);
        size = stats.size;
        lastModified = stats.mtime;
      } catch (_) {
        // lstat 失败时仍显示条目，仅缺少元数据
      }

      const node = {
        name: entry.name,
        path: childPath,
        type: isDir ? 'directory' : 'file',
        size,
        lastModified,
        loaded: false,
        hasChildren: false
      };

      if (isDir) {
        // 快速检测该目录是否有可见子项（只列一层，不递归）
        try {
          const subEntries = await fs.promises.readdir(childPath, { withFileTypes: true });
          const visibleSubEntries = subEntries.filter(sub => {
            const subPath = path.join(childPath, sub.name);
            return !isBlocked(subPath, sub.name, rules) && !sub.name.endsWith('.assets');
          });
          node.hasChildren = visibleSubEntries.length > 0;
        } catch (_) {
          node.hasChildren = false;
        }
        node.children = []; // 初始为空，展开时懒加载
      }

      children.push(node);
    }

    // 目录优先，同类按名排序
    children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return children;
  } catch (error) {
    console.warn(`Cannot read directory ${dirPath}:`, error.message);
    return [];
  }
}

async function getDirectoryTree(dirPath) {
  const stats = await fs.promises.stat(dirPath);
  const name = path.basename(dirPath);
  const rules = loadBlockRules();
  
  const node = {
    name: name || dirPath,
    path: dirPath,
    type: stats.isDirectory() ? 'directory' : 'file',
    size: stats.size,
    lastModified: stats.mtime
  };

  if (stats.isDirectory()) {
    try {
      const children = await fs.promises.readdir(dirPath);
      node.children = [];
      
      for (const child of children) {
        const childPath = path.join(dirPath, child);
        
        // 检查是否被屏蔽
        if (isBlocked(childPath, child, rules)) {
          console.log(`Skipping blocked item: ${child}`);
          continue;
        }
        
        // 屏蔽 .assets 后缀的文件夹（保留原有逻辑）
        if (child.endsWith('.assets')) {
          console.log(`Skipping .assets folder: ${child}`);
          continue;
        }
        
        try {
          const childNode = await getDirectoryTree(childPath);
          node.children.push(childNode);
        } catch (error) {
          // Skip files that can't be accessed
          console.warn(`Skipping ${childPath}:`, error.message);
        }
      }
      
      // Sort children: directories first, then files
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.warn(`Cannot read directory ${dirPath}:`, error.message);
    }
  }

  return node;
}