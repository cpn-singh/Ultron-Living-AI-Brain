@echo off
title ULTRON Living AI Brain - Desktop App
cd /d "D:\Ultron-Living-AI-Brain"
echo ========================================================
echo   ULTRON Living AI Brain - Electron Desktop App
echo   Hardware-level OS control & Native App Launching
echo ========================================================
echo.
call npm run electron:dev
pause
