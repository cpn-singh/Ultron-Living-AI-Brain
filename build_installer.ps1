# ==============================================================================
#                ULTRON -- CYBERNETIC LIVING AI BRAIN
#                  Windows (.exe) Installer Builder (PowerShell)
# ==============================================================================

$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "               ULTRON -- CYBERNETIC LIVING AI BRAIN" -ForegroundColor Cyan
Write-Host "                 Windows (.exe) Installer Builder" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# [1/4] Compile Python Backend Engine (Option B)
Write-Host "[1/4] Checking Python Backend Engine compilation (Option B)..." -ForegroundColor Yellow
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue

if ($pythonCmd) {
    Write-Host "Python detected ($($pythonCmd.Source)). Generating icons..." -ForegroundColor Green
    python scripts/create_icon.py

    Write-Host "Ensuring PyInstaller is installed..." -ForegroundColor Green
    python -m pip install --quiet pyinstaller

    Write-Host "Compiling server/app.py into standalone server/ultron_engine.exe..." -ForegroundColor Green
    python -m PyInstaller --onefile --noconsole --name ultron_engine --distpath server server/app.py

    # Clean up temp spec and build files
    if (Test-Path "build/ultron_engine") { Remove-Item -Recurse -Force "build/ultron_engine" }
    if (Test-Path "ultron_engine.spec") { Remove-Item -Force "ultron_engine.spec" }
    if (Test-Path "server/ultron_engine.spec") { Remove-Item -Force "server/ultron_engine.spec" }

    if (Test-Path "server/ultron_engine.exe") {
        Write-Host "[OK] Standalone Python engine compiled: server/ultron_engine.exe" -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] Python not found in system PATH. Packaging with client fallback mode." -ForegroundColor Gray
}

Write-Host ""
# [2/4] Install electron-builder
Write-Host "[2/4] Installing / Verifying electron-builder..." -ForegroundColor Yellow
npm install --save-dev electron-builder

Write-Host ""
# [3/4] Build Vite production bundle
Write-Host "[3/4] Building Vite React frontend distribution (dist/)..." -ForegroundColor Yellow
npm run build

Write-Host ""
# [4/4] Package NSIS Installer
Write-Host "[4/4] Packaging NSIS Windows Installer (Ultron-Setup-1.0.0.exe)..." -ForegroundColor Yellow
npx electron-builder --win nsis

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
if (Test-Path "release/ULTRON Setup 1.0.0.exe") {
    $fullPath = (Resolve-Path "release/ULTRON Setup 1.0.0.exe").Path
    Write-Host "[SUCCESS] Windows Installer created successfully!" -ForegroundColor Green
    Write-Host "Installer Location: $fullPath" -ForegroundColor White
    Write-Host "You can now run this .exe to install ULTRON directly on your PC!" -ForegroundColor Green
} else {
    Write-Host "[FINISHED] Build script completed. Inspect release/ folder for generated binaries." -ForegroundColor Yellow
}
Write-Host "==============================================================================" -ForegroundColor Cyan
