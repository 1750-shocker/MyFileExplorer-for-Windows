@echo off
echo =========================================
echo MyNoteExplorer - Build Portable Unpacked
echo =========================================
echo.

echo ==== packaging ====
echo Running npm run build:win ...
echo This will close old app processes, clean output, build React, and package Electron.
echo.

:: Switch to the script directory, which is the project root.
cd /d "%~dp0"

:: Run the package command.
call npm run build:win

echo.
if %errorlevel% equ 0 (
    echo =========================================
    echo Packaging succeeded.
    echo Output: release\win-unpacked
    echo =========================================
) else (
    echo =========================================
    echo Packaging failed. Check the log above.
    echo =========================================
)

echo.
echo finished
echo.
pause
