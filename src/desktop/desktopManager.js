/**
 * ULTRON Desktop Platform Manager
 * Provides a clean separation of concerns between Desktop PC and Web Browser environments.
 * Ensures the browser version of ULTRON remains completely untouched and pristine.
 */

import { executeDesktopAppLaunch } from './desktopAppLauncher';
import { desktopVoiceEngine } from './desktopVoiceService';

/**
 * Returns true ONLY when running inside the native Electron desktop application.
 * Returns false when running in any web browser (Chrome, Edge, Firefox, Mobile, etc.).
 */
export function isDesktopApp() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.electronAPI && window.electronAPI.isElectron);
}

/**
 * Intercepts desktop commands on PC.
 * If running on Desktop PC, handles app launches with native Windows processes.
 * If running in a web browser, returns null so browser Ultron runs its original logic untouched.
 */
export async function tryHandleDesktopCommand(rawText) {
  if (!isDesktopApp()) {
    // Pure browser mode: do not intercept
    return null;
  }
  return await executeDesktopAppLaunch(rawText);
}

/**
 * Triggers desktop voice recognition on PC.
 */
export async function startDesktopVoice(callbacks = {}) {
  return new Promise((resolve) => {
    desktopVoiceEngine.startManualRecording((result) => {
      resolve(result);
    });
  });
}

/**
 * Stop desktop voice recognition on PC.
 */
export async function stopDesktopVoice() {
  desktopVoiceEngine.stopManualRecording();
}

export { desktopVoiceEngine };
