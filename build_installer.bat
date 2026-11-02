@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo                ULTRON -- CYBERNETIC LIVING AI BRAIN
echo                  Windows (.exe) Installer Builder
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Python Backend Engine compilation (Option B)...
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Python detected. Generating application icons...
    python scripts\create_icon.py

    echo Ensuring PyInstaller is installed...
    py -m pip install --quiet pyinstaller 2>nul || python -m pip install --quiet pyinstaller

    echo Compiling server/app.py into standalone server/ultron_engine.exe...
    python -m PyInstaller --onefile --noconsole --name ultron_engine --distpath server server/app.py
    
    REM Clean up temporary pyinstaller artifacts
    if exist "build\ultron_engine" rmdir /s /q "build\ultron_engine"
    if exist "ultron_engine.spec" del /f /q "ultron_engine.spec"
    if exist "server\ultron_engine.spec" del /f /q "server\ultron_engine.spec"

    if exist "server\ultron_engine.exe" (
        echo [OK] Standalone Python backend successfully compiled to server\ultron_engine.exe
    ) else (
        echo [WARN] Compilation finished, using fallback runtime mode.
    )
) else (
    echo [INFO] Python not found in system PATH. Packaging with client fallback mode.
)

echo.
echo [2/4] Ensuring Node.js dependencies and electron-builder are installed...
call npm install --save-dev electron-builder

echo.
echo [3/4] Building Vite React frontend distribution (dist/)...
call npm run build

echo.
echo [4/4] Packaging NSIS Windows Installer (Ultron-Setup-1.0.0.exe)...
call npx electron-builder --win nsis

echo.
echo ==============================================================================
if exist "release\ULTRON Setup 1.0.0.exe" (
    echo [SUCCESS] Windows Installer created successfully!
    echo Location: %cd%\release\ULTRON Setup 1.0.0.exe
    echo.
    echo You can now run the installer to set up ULTRON on your PC!
) else (
    echo [FINISHED] Build process completed. Check the release\ directory for output.
)
echo ==============================================================================
pause
