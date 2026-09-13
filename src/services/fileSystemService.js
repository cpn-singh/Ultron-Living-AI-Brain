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
  if (notAndroid()) {
    return { success: false, message: 'File operations require Android device', path: '', name };
  }
  try {
    return await UltronFile.createFile({ name, path, content });
  } catch (err) {
    return { success: false, message: err.message, path: '', name };
  }
}

// ──────────────────────────── CREATE FOLDER ────────────────────────────

/**
 * Create a folder inside Downloads/Ultron/.
 * @param {string} name - folder name
 * @param {string} [path=''] - sub-path relative to Downloads/Ultron/
 * @returns {Promise<{success, path, name, message}>}
 */
export async function createFolder(name, path = '') {
  if (notAndroid()) {
    return { success: false, message: 'File operations require Android device', path: '', name };
  }
  try {
    return await UltronFile.createFolder({ name, path });
  } catch (err) {
    return { success: false, message: err.message, path: '', name };
  }
}

// ──────────────────────────── LIST DIRECTORY ────────────────────────────

/**
 * List contents of a directory inside Downloads/Ultron/.
 * @param {string} [path=''] - relative path; empty = root Ultron folder
 * @returns {Promise<{success, path, entries: Array<{name, path, isDirectory, size, modified}>}>}
 */
export async function listDirectory(path = '') {
  if (notAndroid()) {
    return { success: false, path, entries: [], message: 'File operations require Android device' };
  }
  try {
    return await UltronFile.listDirectory({ path });
  } catch (err) {
    return { success: false, path, entries: [], message: err.message };
  }
}

// ──────────────────────────── OPEN FILE ────────────────────────────

/**
 * Open a file with the appropriate system app.
 * @param {string} path - absolute path or filename relative to Ultron root
 * @returns {Promise<{success, path}>}
 */
export async function openFile(path) {
  if (notAndroid()) {
    return { success: false, message: 'File operations require Android device' };
  }
  try {
    return await UltronFile.openFile({ path });
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ──────────────────────────── LAUNCH APP ────────────────────────────

/**
 * Launch any installed Android app by name or package.
 * @param {string} appName - natural app name e.g. "youtube"
 * @param {string} [packageName=''] - optional exact package e.g. "com.google.android.youtube"
 * @returns {Promise<{success, packageName, message}>}
 */
export async function launchApp(appName, packageName = '') {
  if (notAndroid()) {
    return { success: false, message: 'App launching requires Android device' };
  }
  try {
    return await UltronFile.launchApp({ appName, packageName });
  } catch (err) {
    return { success: false, message: err.message };
  }
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
