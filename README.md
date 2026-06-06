# MyNoteExplorer

一个基于 Electron + React + TypeScript 的 Windows 文件浏览器，专门用于以树形结构浏览本地笔记、文档和工程目录。

## 功能特性

- 🌳 **懒加载文件树**: 只加载当前目录的直接子项，展开子目录时再继续读取，适合较大的目录。
- 📁 **文件类型图标**: 根据常见扩展名显示不同图标，目录优先排序。
- ⭐ **收藏夹**: 可收藏当前路径，支持自定义显示名称、删除收藏和拖拽排序。
- 🔍 **文件名搜索**: 在当前目录下递归搜索文件名，最多返回 100 条结果，支持键盘选择和定位高亮。
- 🚫 **屏蔽规则**: 可屏蔽指定文件/文件夹、指定扩展名，以及 `.001`、`.002` 这类数字后缀文件。
- 🖱️ **右键菜单**: 支持刷新、复制绝对路径、在系统文件浏览器中打开、屏蔽和删除。
- 💻 **原生桌面体验**: 基于 Electron 调用系统能力，用默认程序打开文件。

## 安装依赖

```bash
npm install
```

## 开发模式

```bash
npm run electron-dev
```

该命令会同时启动 React 开发服务器和 Electron 应用。

## 构建应用

```bash
npm run build
```

这是最便宜的验证方式，只构建 React 渲染层。

## 打包为 Windows 可执行文件（win-unpacked）

推荐从仓库根目录运行：

```bat
build_unpack.bat
```

也可以直接运行：

```bash
npm run build:win
```

`npm run build:win` 会自动完成以下步骤：

1. 强制关闭正在运行的 `MyNoteExplorer.exe` 和 `electron.exe`
2. 删除旧的 `release\win-unpacked` 目录
3. 重新构建 React 前端
4. 使用 `electron-builder --dir` 重新打包 Electron 应用

打包完成后，可执行文件位于：

```text
release/win-unpacked/MyNoteExplorer.exe
```

## 项目结构

```text
MyNoteExplorer/
├── public/
│   ├── electron.js          # Electron 主进程和 IPC 处理
│   ├── preload.js           # 渲染层安全桥接 API
│   └── index.html           # HTML 模板
├── src/
│   ├── components/
│   │   ├── BlockManager.tsx # 屏蔽规则管理弹窗
│   │   ├── FileTree.tsx     # 懒加载文件树组件
│   │   └── *.css            # 组件样式
│   ├── services/
│   │   └── fileSystem.ts    # 渲染层文件系统服务，封装 IPC 调用
│   ├── types/
│   │   └── index.ts         # TypeScript 类型定义
│   ├── App.tsx              # 主应用组件
│   ├── App.css              # 主应用样式
│   ├── index.tsx            # React 入口
│   └── index.css            # 全局样式
├── assets/
│   └── favicon.ico          # Windows 打包图标
├── package.json
├── tsconfig.json
└── README.md
```

## 使用说明

1. 启动应用后不会自动加载目录，需要先在顶部路径输入框输入要浏览的文件夹路径。
2. 点击“浏览”加载目录，根目录会默认展开，子目录在点击展开时懒加载。
3. 点击星标按钮可收藏当前路径；右键收藏项可修改显示名称或删除收藏。
4. 在搜索框输入文件名关键字，可搜索当前目录下的文件和文件夹；上下方向键可切换结果，回车定位。
5. 右键文件树节点可刷新、复制路径、在系统文件浏览器中打开、添加屏蔽规则或删除文件。
6. 点击顶部屏蔽管理按钮可查看并移除已保存的屏蔽规则。

## 数据存储

- 收藏夹保存在浏览器 `localStorage` 的 `pathFavorites`。
- 文件右键菜单顺序保存在 `localStorage` 的 `fileContextMenuOrder`。
- 屏蔽规则保存在用户目录下的 `.myfileexplorer-block-rules.json`。

## 验证说明

- 推荐使用 `npm run build` 做基础验证。
- 当前项目没有测试用例，直接运行 `npm test` 不是有效 smoke test；如果需要空测试通过，需要额外添加 `--passWithNoTests`。

## 注意事项

- 删除操作会调用 Electron 的 `shell.trashItem(targetPath)`，将文件或文件夹移入系统回收站。
- 渲染层通过 `preload.js` 暴露的 `window.fileSystemApi` 调用主进程能力，主窗口关闭了 `nodeIntegration` 并启用了 `contextIsolation`。
- `server.js`、`file-explorer-app.html`、`simple-file-explorer.html` 是旧入口，不属于当前 `package.json` 暴露的 Electron/CRA 主流程。
