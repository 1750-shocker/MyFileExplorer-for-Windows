# MyNoteExplorer

一个基于 Electron + React 的 Windows 文件浏览器，专门用于浏览笔记文件，以树形结构展示嵌套的文件夹。

## 功能特性

- 🌳 **树形结构展示**: 清晰展示文件夹的嵌套关系
- 📁 **智能图标**: 根据文件类型显示不同图标
- 🚀 **快速访问**: 提供常用文件夹的快速访问按钮
- 💻 **原生体验**: 基于 Electron 的桌面应用
- 🎯 **专注笔记**: 针对笔记文件浏览优化

## 安装依赖

```bash
npm install
```

## 开发模式

```bash
npm run electron-dev
```

这将同时启动 React 开发服务器和 Electron 应用。

## 构建应用

```bash
npm run electron-pack
```

## 项目结构

```
MyNoteExplorer/
├── public/
│   ├── electron.js          # Electron 主进程
│   └── index.html          # HTML 模板
├── src/
│   ├── components/
│   │   ├── FileTree.tsx    # 文件树组件
│   │   └── FileTree.css    # 文件树样式
│   ├── services/
│   │   └── fileSystem.ts   # 文件系统服务
│   ├── types/
│   │   └── index.ts        # TypeScript 类型定义
│   ├── App.tsx             # 主应用组件
│   ├── App.css             # 主应用样式
│   ├── index.tsx           # React 入口
│   └── index.css           # 全局样式
├── package.json
├── tsconfig.json
└── README.md
```

## 使用说明

1. 启动应用后，默认会加载用户主目录
2. 在顶部路径输入框中输入要浏览的文件夹路径
3. 点击左侧快速访问按钮可快速跳转到常用文件夹
4. 点击文件夹图标可展开/折叠文件夹
5. 点击文件可用系统默认程序打开

## 下一步计划

- [ ] 添加搜索功能
- [ ] 添加文件预览
- [ ] 添加收藏夹功能
- [ ] 添加右键菜单
- [ ] 性能优化（大文件夹处理）