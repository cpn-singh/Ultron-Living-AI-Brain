import { registerPlugin, Capacitor } from '@capacitor/core';

// Register the native plugin
const UltronFile = registerPlugin('UltronFile');

function notAndroid() {
  return !Capacitor.isNativePlatform();
}

// ──────────────────────────── CREATE FILE ────────────────────────────

/**
 * Create a file inside Downloads/Ultron/.
 * @param {string} name - filename e.g. "notes.txt"
 * @param {string} [path=''] - sub-path relative to Downloads/Ultron/
 * @param {string} [content=''] - optional text content to write
 * @returns {Promise<{success, path, name, message}>}
 */
export async function createFile(name, path = '', content = '') {
  // 1. Electron Desktop Native
  if (window.electronAPI && typeof window.electronAPI.desktopCreateFile === 'function') {
    try {
      const res = await window.electronAPI.desktopCreateFile({ name, content });
      if (res && res.success) return res;
    } catch (e) {}
  }

  // 2. Android Capacitor Plugin
  if (Capacitor.isNativePlatform()) {
    try {
      return await UltronFile.createFile({ name, path, content });
    } catch (err) {
      return { success: false, message: err.message, path: '', name };
    }
  }

  // 3. In-Browser Local Storage Fallback
  try {
    const key = `ultron_file_${name}`;
    localStorage.setItem(key, content || '');
    return { success: true, path: `Downloads/Ultron/${name}`, name, message: 'Saved to Ultron storage' };
  } catch (err) {
    return { success: false, message: err.message, path: '', name };
  }
}

// ──────────────────────────── CREATE FOLDER ────────────────────────────

export async function createFolder(name, path = '') {
  if (Capacitor.isNativePlatform()) {
    try {
      return await UltronFile.createFolder({ name, path });
    } catch (err) {
      return { success: false, message: err.message, path: '', name };
    }
  }
  return { success: true, path: `Downloads/Ultron/${name}`, name, message: 'Folder initialized' };
}

// ──────────────────────────── LIST DIRECTORY ────────────────────────────

export async function listDirectory(path = '') {
  // 1. Electron Desktop Native
  if (window.electronAPI && typeof window.electronAPI.desktopListFiles === 'function') {
    try {
      const res = await window.electronAPI.desktopListFiles();
      if (res && res.success) return res;
    } catch (e) {}
  }

  // 2. Android Capacitor Plugin
  if (Capacitor.isNativePlatform()) {
    try {
      return await UltronFile.listDirectory({ path });
    } catch (err) {
      return { success: false, path, entries: [], message: err.message };
    }
  }

  // 3. Web Local Storage Simulation
  try {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('ultron_file_')) {
        const fileName = k.replace('ultron_file_', '');
        entries.push({
          name: fileName,
          path: `Downloads/Ultron/${fileName}`,
          isDirectory: false,
          size: (localStorage.getItem(k) || '').length,
          modified: new Date().toLocaleDateString()
        });
      }
    }
    return { success: true, path: 'Downloads/Ultron/', entries };
  } catch (err) {
    return { success: true, path: 'Downloads/Ultron/', entries: [] };
  }
}

// ──────────────────────────── OPEN FILE ────────────────────────────

export async function openFile(path) {
  // 1. Electron Desktop Native
  if (window.electronAPI && typeof window.electronAPI.desktopOpenFile === 'function') {
    try {
      const res = await window.electronAPI.desktopOpenFile(path);
      if (res && res.success) return res;
    } catch (e) {}
  }

  // 2. Android Capacitor Plugin
  if (Capacitor.isNativePlatform()) {
    try {
      return await UltronFile.openFile({ path });
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  return { success: true, message: `Opened ${path}` };
}

// ──────────────────────────── OPEN EXTERNAL URL ────────────────────────────

/**
 * Open an external URL safely across Electron, Local Python Host Engine, or Web Browser.
 * Bypasses Chrome popup-blocker when Python server is active.
 * @param {string} url - Target web URL
 * @returns {Promise<{success: boolean, method: string}>}
 */
export async function openExternalUrl(url) {
  if (!url) return { success: false, method: 'none' };

  // 1. Electron Desktop IPC
  if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
    try {
      window.electronAPI.openExternal(url);
      return { success: true, method: 'electron' };
    } catch (e) {}
  }

  // 2. Python Backend Host OS Launcher (Direct OS shell execution)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const pyRes = await fetch('http://127.0.0.1:8000/api/open-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (pyRes && pyRes.ok) {
      const data = await pyRes.json();
      if (data.success) {
        return { success: true, method: 'python-os' };
      }
    }
  } catch (e) {}

  // 3. Browser window.open
  try {
    if (typeof window !== 'undefined') {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (opened) return { success: true, method: 'window.open' };
    }
  } catch (e) {}

  return { success: false, method: 'unopened' };
}

// ──────────────────────────── LAUNCH APP ────────────────────────────

/**
 * Launch any installed PC desktop application or Android app by name/package.
 * @param {string} appName - natural app name e.g. "chrome", "notepad", "calculator"
 * @param {string} [packageName=''] - optional exact package e.g. "com.google.android.youtube"
 * @returns {Promise<{success, packageName, message, isDesktop, isWeb}>}
 */
export async function launchApp(appName, packageName = '') {
  const cleanApp = (appName || '').trim();
  if (!cleanApp) return { success: false, message: 'No app name provided.' };

  // 1. Electron Desktop IPC check (Runs natively on Desktop PC)
  if (window.electronAPI && typeof window.electronAPI.launchDesktopApp === 'function') {
    try {
      const desktopRes = await window.electronAPI.launchDesktopApp(cleanApp);
      if (desktopRes && desktopRes.success) {
        return { success: true, packageName: desktopRes.appName || cleanApp, message: desktopRes.message, isDesktop: true };
      }
    } catch (err) {
      console.warn('[launchApp] Electron IPC launch error:', err);
    }
  }

  // 2. Local Python Backend Server fallback (http://127.0.0.1:8000/api/launch-app)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const pyRes = await fetch('http://127.0.0.1:8000/api/launch-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: cleanApp }),
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (pyRes && pyRes.ok) {
      const pyData = await pyRes.json();
      if (pyData.success) {
        return { success: true, packageName: cleanApp, message: pyData.message, isDesktop: true };
      }
    }
  } catch (err) {
    // Python backend offline
  }

  // 3. Android Native Capacitor Plugin check
  if (Capacitor.isNativePlatform()) {
    try {
      return await UltronFile.launchApp({ appName: cleanApp, packageName });
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // 4. Web Browser fallback: Open common web URLs if on pure web browser
  try {
    const webProtocolMap = {
      'chrome': 'https://google.com',
      'google chrome': 'https://google.com',
      'youtube': 'https://youtube.com',
      'spotify': 'https://open.spotify.com',
      'github': 'https://github.com',
      'whatsapp': 'https://web.whatsapp.com',
      'gmail': 'https://mail.google.com',
      'vscode': 'https://vscode.dev',
      'vs code': 'https://vscode.dev'
    };
    const targetUrl = webProtocolMap[cleanApp.toLowerCase()];
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return { success: true, packageName: cleanApp, message: `Opened ${cleanApp} in web browser.`, isWeb: true };
    }
  } catch (err) {}

  return { success: false, message: `Could not launch "${cleanApp}" on PC or mobile.` };
}

// ──────────────────────────── GET INSTALLED APPS ────────────────────────────

/**
 * Get list of all installed launchable apps.
 * @returns {Promise<{apps: Array<{name, packageName}>}>}
 */
export async function getInstalledApps() {
  if (notAndroid()) {
    return { apps: [] };
  }
  try {
    return await UltronFile.getInstalledApps();
  } catch {
    return { apps: [] };
  }
}
