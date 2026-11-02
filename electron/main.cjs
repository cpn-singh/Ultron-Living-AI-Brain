const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { spawn } = require('child_process');

// Redirect Electron User Data to writable temp directory (Fixes Windows Access Denied 0x5 GPU cache crash)
const userDataPath = path.join(os.tmpdir(), 'ultron-electron-data');
if (!fs.existsSync(userDataPath)) {
  try { fs.mkdirSync(userDataPath, { recursive: true }); } catch (e) {}
}
app.setPath('userData', userDataPath);

// Prevent Chromium GPU Cache Access Denied (0x5) crashes on Windows & enable real microphone access
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('user-data-dir', userDataPath);
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('log-level', '3');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'http://127.0.0.1:5173');

let mainWindow = null;
let pythonProcess = null;
let staticServer = null;

const PORT = 5173;
const DIST_DIR = path.join(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Start zero-dependency Node static HTTP server for dist/ on http://127.0.0.1:5173
 * Bypasses all Electron file:// protocol ES module restrictions & CORS issues!
 */
function startStaticServer() {
  if (staticServer) return;

  staticServer = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    let filePath = path.join(DIST_DIR, reqPath === '/' ? 'index.html' : reqPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        });
        res.end(content);
      }
    });
  });

  staticServer.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`[Electron] Port ${PORT} already active, using existing server.`);
    } else {
      console.warn('[Electron] Static server error:', e.message);
    }
  });

  staticServer.listen(PORT, '127.0.0.1', () => {
    console.log(`[Electron] Static App Server active on http://127.0.0.1:${PORT}`);
  });
}

// Prevent uncaught main process errors from terminating Electron
process.on('uncaughtException', (err) => {
  console.warn('[Electron Main Process Uncaught Exception]', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Electron Main Process Unhandled Rejection]', reason);
});

// Start Python Backend Process on http://127.0.0.1:8000 with standalone binary (Option B) support
function startPythonBackend() {
  const isPackaged = app.isPackaged;
  const resDir = process.resourcesPath || '';

  // 1. Check for standalone compiled binary first (Option B: 100% self-contained)
  const exeCandidates = [
    path.join(resDir, 'server', 'ultron_engine.exe'),
    path.join(resDir, 'app.asar.unpacked', 'server', 'ultron_engine.exe'),
    path.join(__dirname, '../server/ultron_engine.exe'),
    path.join(__dirname, '../server/dist/ultron_engine.exe')
  ];

  for (const exePath of exeCandidates) {
    if (exePath && fs.existsSync(exePath)) {
      try {
        pythonProcess = spawn(exePath, [], {
          cwd: path.dirname(exePath),
          stdio: 'ignore',
          windowsHide: true,
        });

        pythonProcess.on('error', (err) => {
          console.warn('[Electron] Standalone engine process error:', err.message);
          pythonProcess = null;
        });

        console.log(`[Electron] Started Standalone Python Engine from: ${exePath}`);
        return;
      } catch (err) {
        console.warn('[Electron] Failed to spawn standalone engine:', err.message);
        pythonProcess = null;
      }
    }
  }

  // 2. Fallback to python script execution if standalone binary is not found
  const scriptCandidates = [
    path.join(resDir, 'server', 'app.py'),
    path.join(resDir, 'app.asar.unpacked', 'server', 'app.py'),
    path.join(__dirname, '../server/app.py')
  ];

  const pythonScript = scriptCandidates.find(p => p && fs.existsSync(p));
  if (!pythonScript) {
    console.warn('[Electron] No backend script found. Operating in client fallback mode.');
    return;
  }

  const pythonCmds = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

  function trySpawn(index) {
    if (index >= pythonCmds.length) {
      console.warn('[Electron] Python executable not found in PATH. Operating in client fallback mode.');
      return;
    }

    const cmd = pythonCmds[index];
    try {
      pythonProcess = spawn(cmd, [pythonScript], {
        cwd: path.dirname(pythonScript),
        stdio: 'ignore',
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
        }
      });

      pythonProcess.on('error', (err) => {
        console.warn(`[Electron] Could not spawn '${cmd}':`, err.message);
        pythonProcess = null;
        trySpawn(index + 1);
      });

      console.log(`[Electron] Started Python Backend Service (${cmd}) on http://127.0.0.1:8000`);
    } catch (err) {
      pythonProcess = null;
      trySpawn(index + 1);
    }
  }

  trySpawn(0);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'ULTRON — Cybernetic Core',
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  mainWindow.show();
  mainWindow.focus();

  const appUrl = `http://127.0.0.1:${PORT}`;

  mainWindow.loadURL(appUrl).catch((err) => {
    console.warn('[Electron] Loading local URL failed, loading file fallback:', err.message);
    const distHtmlPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(distHtmlPath)) {
      mainWindow.loadFile(distHtmlPath);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// App lifecycle
app.whenReady().then(() => {
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true);
    });
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      return true;
    });
    if (session.defaultSession.setDevicePermissionHandler) {
      session.defaultSession.setDevicePermissionHandler(() => true);
    }
  }

  startStaticServer();
  startPythonBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    try { pythonProcess.kill(); } catch (e) {}
    pythonProcess = null;
  }
  if (staticServer) {
    try { staticServer.close(); } catch (e) {}
    staticServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) {
    try { pythonProcess.kill(); } catch (e) {}
    pythonProcess = null;
  }
  if (staticServer) {
    try { staticServer.close(); } catch (e) {}
    staticServer = null;
  }
});

// IPC handlers
ipcMain.on('open-external', (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    pythonBackend: 'http://127.0.0.1:8000',
  };
});

ipcMain.handle('get-db-config', () => {
  const configFile = path.join(userDataPath, 'ultron_db_config.json');
  if (fs.existsSync(configFile)) {
    try {
      return JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (e) {}
  }
  return {
    postgresUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
    backendUrl: 'http://127.0.0.1:8000',
  };
});

ipcMain.handle('save-db-config', (_event, config) => {
  const configFile = path.join(userDataPath, 'ultron_db_config.json');
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

let activeSpeechChild = null;

ipcMain.handle('desktop-speech-recognize', async (_event, options) => {
  const timeoutSeconds = (options && options.timeout) || 6;

  if (activeSpeechChild) {
    try { activeSpeechChild.kill(); } catch (e) {}
    activeSpeechChild = null;
  }

  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, transcript: '', error: 'Only Windows is supported for native SAPI' });
    }

    const script = `
      [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      Add-Type -AssemblyName System.Speech
      try {
        $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $engine.SetInputToDefaultAudioDevice()
        $dictation = New-Object System.Speech.Recognition.DictationGrammar
        $engine.LoadGrammar($dictation)
        $res = $engine.Recognize([TimeSpan]::FromSeconds(${timeoutSeconds}))
        if ($res -and $res.Text) {
          Write-Output $res.Text
        }
      } catch {
        Write-Error $_.Exception.Message
      }
    `;

    try {
      activeSpeechChild = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', script
      ], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      activeSpeechChild.stdout.on('data', (d) => {
        stdout += d.toString('utf8');
      });

      activeSpeechChild.stderr.on('data', (d) => {
        stderr += d.toString('utf8');
      });

      activeSpeechChild.on('close', () => {
        activeSpeechChild = null;
        const text = stdout.trim();
        if (text) {
          console.log('[Electron Native STT Result]:', text);
          resolve({ success: true, transcript: text, engine: 'Windows System.Speech' });
        } else {
          resolve({ success: false, transcript: '', error: stderr.trim() || 'No speech detected' });
        }
      });

      activeSpeechChild.on('error', (err) => {
        activeSpeechChild = null;
        console.warn('[Electron Native STT Error]:', err.message);
        resolve({ success: false, transcript: '', error: err.message });
      });
    } catch (e) {
      activeSpeechChild = null;
      resolve({ success: false, transcript: '', error: e.message });
    }
  });
});

ipcMain.handle('desktop-speech-stop', async () => {
  if (activeSpeechChild) {
    try { activeSpeechChild.kill(); } catch (e) {}
    activeSpeechChild = null;
  }
  return { success: true };
});

ipcMain.handle('launch-desktop-app', async (_event, appName) => {
  if (!appName || typeof appName !== 'string') {
    return { success: false, message: 'Invalid app name provided.' };
  }

  const cleanApp = appName.trim().toLowerCase();

  // Mapping for common Windows / Desktop software and protocols
  const APP_COMMANDS = {
    'chrome': 'start chrome',
    'google chrome': 'start chrome',
    'browser': 'start chrome',
    'web browser': 'start chrome',
    'notepad': 'start notepad',
    'notebook': 'start notepad',
    'notes': 'start notepad',
    'text editor': 'start notepad',
    'calculator': 'start calc',
    'calc': 'start calc',
    'cmd': 'start cmd',
    'command prompt': 'start cmd',
    'terminal': 'start cmd',
    'powershell': 'start powershell',
    'explorer': 'start explorer',
    'file explorer': 'start explorer',
    'files': 'start explorer',
    'my files': 'start explorer',
    'vscode': 'start code',
    'vs code': 'start code',
    'code': 'start code',
    'spotify': 'start spotify:',
    'music': 'start spotify:',
    'word': 'start winword',
    'microsoft word': 'start winword',
    'excel': 'start excel',
    'microsoft excel': 'start excel',
    'powerpoint': 'start powerpnt',
    'ppt': 'start powerpnt',
    'vlc': 'start vlc',
    'paint': 'start mspaint',
    'task manager': 'start taskmgr',
    'taskmgr': 'start taskmgr',
    'control panel': 'start control',
    'settings': 'start ms-settings:',
    'edge': 'start msedge',
    'microsoft edge': 'start msedge',
    'firefox': 'start firefox',
    'discord': 'start discord:',
    'whatsapp': 'start whatsapp:',
    'snipping tool': 'start snippingtool',
    'camera': 'start microsoft.windows.camera:',
    'store': 'start ms-windows-store:',
  };

  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  return new Promise((resolve) => {
    let command = '';

    if (isWin) {
      command = APP_COMMANDS[cleanApp] || `start "" "${cleanApp}"`;
    } else if (isMac) {
      command = `open -a "${cleanApp}"`;
    } else {
      command = `xdg-open "${cleanApp}" || "${cleanApp}"`;
    }

    const { exec } = require('child_process');
    exec(command, (error) => {
      if (error) {
        if (isWin && !APP_COMMANDS[cleanApp]) {
          exec(`cmd /c start ${cleanApp}`, (err2) => {
            if (err2) {
              resolve({
                success: false,
                appName: cleanApp,
                message: `Could not launch "${appName}" on PC. Error: ${err2.message}`
              });
            } else {
              resolve({
                success: true,
                appName: cleanApp,
                message: `Successfully launched "${appName}" on PC!`
              });
            }
          });
          return;
        }
        resolve({
          success: false,
          appName: cleanApp,
          message: `Could not launch "${appName}" on PC. Error: ${error.message}`
        });
      } else {
        resolve({
          success: true,
          appName: cleanApp,
          message: `Successfully launched "${appName}" on PC!`
        });
      }
    });
  });
});

ipcMain.handle('desktop-list-files', async () => {
  const ultronDir = path.join(os.homedir(), 'Downloads', 'Ultron');
  if (!fs.existsSync(ultronDir)) {
    try { fs.mkdirSync(ultronDir, { recursive: true }); } catch (e) {}
  }
  try {
    const files = fs.readdirSync(ultronDir, { withFileTypes: true });
    const entries = files.map(f => {
      const fullPath = path.join(ultronDir, f.name);
      let stat = {};
      try { stat = fs.statSync(fullPath); } catch (e) {}
      return {
        name: f.name,
        path: fullPath,
        isDirectory: f.isDirectory(),
        size: stat.size || 0,
        modified: stat.mtime ? stat.mtime.toLocaleDateString() : ''
      };
    });
    return { success: true, path: ultronDir, entries };
  } catch (err) {
    return { success: false, message: err.message, entries: [] };
  }
});

ipcMain.handle('desktop-create-file', async (_event, payload) => {
  const { name = 'notes.txt', content = '' } = payload || {};
  const ultronDir = path.join(os.homedir(), 'Downloads', 'Ultron');
  if (!fs.existsSync(ultronDir)) {
    try { fs.mkdirSync(ultronDir, { recursive: true }); } catch (e) {}
  }
  const filePath = path.join(ultronDir, name);
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath, name, message: 'Created successfully on PC' };
  } catch (err) {
    return { success: false, message: err.message, path: '', name };
  }
});

ipcMain.handle('desktop-open-file', async (_event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});
