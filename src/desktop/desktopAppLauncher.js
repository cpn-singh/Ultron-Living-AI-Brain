/**
 * ULTRON Desktop PC Software Launcher
 * Dedicated service for launching native Windows applications.
 * Completely isolated from mobile Capacitor schemes to protect browser Ultron.
 */

const PC_APP_ALIASES = {
  'notebook': 'notepad',
  'notes': 'notepad',
  'text editor': 'notepad',
  'browser': 'chrome',
  'web browser': 'chrome',
  'google chrome': 'chrome',
  'chrome': 'chrome',
  'calculator': 'calc',
  'calc': 'calc',
  'cmd': 'cmd',
  'command prompt': 'cmd',
  'terminal': 'cmd',
  'powershell': 'powershell',
  'explorer': 'explorer',
  'file explorer': 'explorer',
  'files': 'explorer',
  'my files': 'explorer',
  'vscode': 'code',
  'vs code': 'code',
  'code': 'code',
  'spotify': 'spotify',
  'word': 'winword',
  'microsoft word': 'winword',
  'excel': 'excel',
  'microsoft excel': 'excel',
  'powerpoint': 'powerpnt',
  'ppt': 'powerpnt',
  'paint': 'mspaint',
  'task manager': 'taskmgr',
  'taskmgr': 'taskmgr',
  'control panel': 'control',
  'settings': 'settings',
  'edge': 'msedge',
  'microsoft edge': 'msedge',
  'firefox': 'firefox',
  'discord': 'discord',
  'whatsapp': 'whatsapp',
  'snipping tool': 'snippingtool',
  'camera': 'camera',
  'vlc': 'vlc',
};

/**
 * Launch an installed desktop software program on PC.
 * @param {string} rawCommand - user prompt e.g. "open notebook", "launch chrome"
 * @returns {Promise<string|null>} - formatted response markdown, or null if not a launch command
 */
export async function executeDesktopAppLaunch(rawCommand) {
  if (!rawCommand) return null;
  const lower = rawCommand.trim().toLowerCase();

  const isLaunchIntent =
    lower.startsWith('open ') ||
    lower.startsWith('launch ') ||
    lower.startsWith('start ') ||
    lower.startsWith('run ') ||
    lower.includes('open software') ||
    lower.includes('launch software') ||
    lower.includes('open app') ||
    lower.includes('launch app');

  if (!isLaunchIntent) return null;

  // Extract application name
  let appName = lower
    .replace(/\b(open|launch|start|run|software|program|application|app|the|please|now)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!appName || appName.length < 2) return null;

  // Check alias dictionary
  const targetApp = PC_APP_ALIASES[appName] || appName;

  // 1. Try Electron native desktop IPC
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.launchDesktopApp === 'function') {
    try {
      const res = await window.electronAPI.launchDesktopApp(targetApp);
      if (res && res.success) {
        return `### 💻 Software Launched on PC!\n- **Software**: \`${appName}\` (executed: \`${targetApp}\`)\n- **Platform**: Windows PC\n\nULTRON successfully launched **${appName}** on your computer!`;
      } else if (res && res.message) {
        console.warn('[DesktopAppLauncher] Electron launch error:', res.message);
      }
    } catch (err) {
      console.warn('[DesktopAppLauncher] Electron IPC exception:', err);
    }
  }

  // 2. Try Local Python Backend OS Launcher
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const pyRes = await fetch('http://127.0.0.1:8000/api/launch-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: targetApp }),
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (pyRes && pyRes.ok) {
      const data = await pyRes.json();
      if (data && data.success) {
        return `### 💻 Software Launched on PC!\n- **Software**: \`${appName}\`\n- **Backend**: Python Engine\n\nULTRON successfully launched **${appName}** on your computer!`;
      }
    }
  } catch (e) {}

  return `### ⚠️ Could Not Launch "${appName}" on PC\n- Checked for installed software with target: \`${targetApp}\`\n\n*Tip: Ensure the application is installed in Windows PATH or try specifying "open notepad", "open chrome", "open calc", or "open code".*`;
}
