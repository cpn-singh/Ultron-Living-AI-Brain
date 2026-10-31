@echo off
title ULTRON Living AI Brain - Browser Mode
cd /d "D:\Ultron-Living-AI-Brain"
echo ========================================================
echo   ULTRON Living AI Brain (D:\Ultron-Living-AI-Brain)
echo ========================================================
echo.
if not exist "node_modules" (
    echo [!] Missing node_modules detected.
    echo [*] Running 'npm install' to install dependencies (React, Vite, Three.js, Lucide)...
    echo [*] Please wait a moment...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed. Please ensure Node.js is installed.
        pause
        exit /b 1
    )
    echo.
    echo [*] Dependencies installed successfully!
    echo.
)

echo [*] Starting Vite Dev Server and opening browser...
call npm run dev:browser
pause
