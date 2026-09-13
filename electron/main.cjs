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

// Prevent Chromium GPU Cache Access Denied (0x5) crashes on Windows & enable Media/Mic access
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('user-data-dir', userDataPath);
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('log-level', '3');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
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

// Start Python Backend Process on http://127.0.0.1:8000 with error event catching
function startPythonBackend() {
  const pythonScript = path.join(__dirname, '../server/app.py');
  if (!fs.existsSync(pythonScript)) return;

  const pythonCmds = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

  function trySpawn(index) {
    if (index >= pythonCmds.length) {
      console.warn('[Electron] Python executable not found in PATH. Operating in client fallback mode.');
      return;
    }

    const cmd = pythonCmds[index];
    try {
      pythonProcess = spawn(cmd, [pythonScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'ignore',
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
