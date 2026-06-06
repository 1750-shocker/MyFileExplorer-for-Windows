# AGENTS

## Stack And Entry Points
- This repo is a single-package Electron + Create React App app, not a monorepo.
- Renderer entry: `src/index.tsx` -> `src/App.tsx`.
- Electron main process: `public/electron.js`.
- If you change file operations or add UI actions, update `public/electron.js` IPC handlers, `public/preload.js`, and `src/services/fileSystem.ts` together.

## Commands
- Install: `npm install`
- Run desktop app in dev: `npm run electron-dev`
- Build renderer only: `npm run build`
- Package Electron app: `npm run electron-pack`
- Build Windows unpacked portable output: `build_unpack.bat` from the repo root is the preferred entrypoint for agents; it wraps `npm run build:win`.
- `npm run build:win` is Windows-specific and already kills `MyNoteExplorer.exe` / `electron.exe`, deletes `release\win-unpacked`, rebuilds, then runs `npx electron-builder --dir`.

## Verification
- Best cheap verification is `npm run build`.
- `npm test` is not a useful smoke test here right now: there are no tests, so `CI=true npm test -- --watchAll=false` exits with code 1 unless you add `--passWithNoTests`.

## Architecture Notes
- The file tree flow is lazy-loaded. `App.tsx` builds the root node from `getDirectoryChildren`; there is no recursive full-tree IPC path in the current app.
- `FileTree.tsx` owns recursive rendering plus per-node expand/load behavior. Browsing bugs are often split between `App.tsx`, `FileTree.tsx`, preload bridge code, and the IPC child-loading code.
- Renderer Electron access goes through `window.fileSystemApi` from `public/preload.js`; the main window has `nodeIntegration: false` and `contextIsolation: true`.

## Persisted State And Side Effects
- Block rules are stored outside the repo in `~/.myfileexplorer-block-rules.json` from `public/electron.js`.
- Favorites and file-context-menu order are stored in renderer `localStorage` keys `pathFavorites` and `fileContextMenuOrder`.
- Delete actions call `fs.promises.rm(targetPath, { recursive: true, force: true })` in the main process. Treat deletion changes as destructive behavior.

## Repo-Specific Gotchas
- `README.md` is stale in at least one important place: the app no longer auto-loads the home directory on startup; `App.tsx` now only restores favorites/menu order.
- `server.js`, `file-explorer-app.html`, and `simple-file-explorer.html` are not part of the current Electron/CRA workflow exposed by `package.json`. Prefer the React/Electron app unless the user explicitly asks about those older files.
