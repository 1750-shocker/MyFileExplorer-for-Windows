@echo off
echo =========================================
echo MyNoteExplorer - 打包 Unpack 便携版本
echo =========================================
echo.

echo 正在执行 npm run build:win ...
echo (此过程包含关闭旧进程、清理缓存、编译 React 和打包)
echo.

:: 切换到脚本所在目录（即项目根目录）
cd /d "%~dp0"

:: 调用 npm 执行打包命令
call npm run build:win

echo.
if %errorlevel% equ 0 (
    echo =========================================
    echo 打包成功！
    echo 请前往 release\win-unpacked 目录查看
    echo =========================================
) else (
    echo =========================================
    echo 打包失败，请检查上方日志。
    echo =========================================
)

echo.
pause
