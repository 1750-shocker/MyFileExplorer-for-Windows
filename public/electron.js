const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
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

// IPC handlers for file system operations
ipcMain.handle('get-directory-tree', async (event, dirPath) => {
  try {
    return await getDirectoryTree(dirPath);
  } catch (error) {
    console.error('Error reading directory:', error);
    return null;
  }
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

async function getDirectoryTree(dirPath) {
  const stats = await fs.promises.stat(dirPath);
  const name = path.basename(dirPath);
  
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
        // 屏蔽 .assets 后缀的文件夹
        if (child.endsWith('.assets')) {
          console.log(`Skipping .assets folder: ${child}`);
          continue;
        }
        
        const childPath = path.join(dirPath, child);
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