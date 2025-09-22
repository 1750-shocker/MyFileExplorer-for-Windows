const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;

// 获取文件图标
function getFileIcon(fileName, isDirectory) {
    if (isDirectory) {
        return '📁';
    }
    
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
        case '.md': return '📝';
        case '.txt': return '📄';
        case '.json': return '⚙️';
        case '.js': case '.ts': return '📜';
        case '.html': return '🌐';
        case '.css': return '🎨';
        case '.py': return '🐍';
        case '.sql': return '🗃️';
        case '.yaml': case '.yml': return '📋';
        case '.png': case '.jpg': case '.jpeg': case '.gif': return '🖼️';
        case '.pdf': return '📕';
        case '.doc': case '.docx': return '📘';
        case '.xls': case '.xlsx': return '📗';
        default: return '📄';
    }
}

// 递归读取目录结构
async function getDirectoryTree(dirPath, maxDepth = 3, currentDepth = 0) {
    try {
        const stats = await fs.promises.stat(dirPath);
        const name = path.basename(dirPath) || dirPath;
        
        const node = {
            name: name,
            path: dirPath,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            lastModified: stats.mtime,
            icon: getFileIcon(name, stats.isDirectory())
        };

        if (stats.isDirectory() && currentDepth < maxDepth) {
            try {
                const children = await fs.promises.readdir(dirPath);
                node.children = [];
                
                // 限制子项数量以避免性能问题
                const limitedChildren = children.slice(0, 50);
                
                for (const child of limitedChildren) {
                    const childPath = path.join(dirPath, child);
                    try {
                        const childNode = await getDirectoryTree(childPath, maxDepth, currentDepth + 1);
                        node.children.push(childNode);
                    } catch (error) {
                        // 跳过无法访问的文件
                        console.warn(`跳过文件 ${childPath}: ${error.message}`);
                    }
                }
                
                // 排序：目录在前，文件在后
                node.children.sort((a, b) => {
                    if (a.type !== b.type) {
                        return a.type === 'directory' ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name, 'zh-CN');
                });
                
                if (children.length > 50) {
                    node.children.push({
                        name: `... 还有 ${children.length - 50} 个项目`,
                        type: 'info',
                        icon: '📋'
                    });
                }
            } catch (error) {
                console.warn(`无法读取目录 ${dirPath}: ${error.message}`);
            }
        }

        return node;
    } catch (error) {
        throw new Error(`无法访问 ${dirPath}: ${error.message}`);
    }
}

// 打开文件
function openFile(filePath) {
    const platform = process.platform;
    let command;
    
    switch (platform) {
        case 'win32':
            command = `start "" "${filePath}"`;
            break;
        case 'darwin':
            command = `open "${filePath}"`;
            break;
        default:
            command = `xdg-open "${filePath}"`;
    }
    
    exec(command, (error) => {
        if (error) {
            console.error(`打开文件失败: ${error.message}`);
        }
    });
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    if (url.pathname === '/') {
        // 提供主页面
        try {
            const html = await fs.promises.readFile('file-explorer-app.html', 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        } catch (error) {
            res.writeHead(404);
            res.end('页面未找到');
        }
    } else if (url.pathname === '/api/directory') {
        // API: 获取目录结构
        const dirPath = url.searchParams.get('path');
        if (!dirPath) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少路径参数' }));
            return;
        }
        
        try {
            const tree = await getDirectoryTree(dirPath);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(tree));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    } else if (url.pathname === '/api/open') {
        // API: 打开文件
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const { filePath } = JSON.parse(body);
                    openFile(filePath);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else {
            res.writeHead(405);
            res.end('方法不允许');
        }
    } else {
        res.writeHead(404);
        res.end('未找到');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 MyNoteExplorer 服务器已启动`);
    console.log(`📂 访问地址: http://localhost:${PORT}`);
    console.log(`💡 按 Ctrl+C 停止服务器`);
    
    // 自动打开浏览器
    const platform = process.platform;
    let command;
    switch (platform) {
        case 'win32':
            command = `start http://localhost:${PORT}`;
            break;
        case 'darwin':
            command = `open http://localhost:${PORT}`;
            break;
        default:
            command = `xdg-open http://localhost:${PORT}`;
    }
    
    exec(command, (error) => {
        if (error) {
            console.log(`请手动打开浏览器访问: http://localhost:${PORT}`);
        }
    });
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});