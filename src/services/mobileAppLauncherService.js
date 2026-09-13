import { AppLauncher } from '@capacitor/app-launcher';

const MOBILE_APP_SCHEMES = {
  'chrome': { url: 'googlechrome://', pkg: 'com.android.chrome', web: 'https://google.com' },
  'google chrome': { url: 'googlechrome://', pkg: 'com.android.chrome', web: 'https://google.com' },
  'colab': { url: 'https://colab.research.google.com', pkg: 'com.google.android.apps.docs', web: 'https://colab.research.google.com' },
  'google colab': { url: 'https://colab.research.google.com', pkg: 'com.google.android.apps.docs', web: 'https://colab.research.google.com' },
  'collab': { url: 'https://colab.research.google.com', pkg: 'com.google.android.apps.docs', web: 'https://colab.research.google.com' },
  'google collab': { url: 'https://colab.research.google.com', pkg: 'com.google.android.apps.docs', web: 'https://colab.research.google.com' },
  'github': { url: 'https://github.com', pkg: 'com.github.android', web: 'https://github.com' },
  'youtube': { url: 'youtube://', pkg: 'com.google.android.youtube', web: 'https://youtube.com' },
  'whatsapp': { url: 'whatsapp://', pkg: 'com.whatsapp', web: 'https://whatsapp.com' },
  'camera': { url: 'camera://', pkg: 'com.android.camera', web: '' },
  'settings': { url: 'android.settings.SETTINGS', pkg: 'com.android.settings', web: '' },
  'maps': { url: 'geo:0,0', pkg: 'com.google.android.apps.maps', web: 'https://maps.google.com' },
  'google maps': { url: 'geo:0,0', pkg: 'com.google.android.apps.maps', web: 'https://maps.google.com' },
  'spotify': { url: 'spotify://', pkg: 'com.spotify.music', web: 'https://spotify.com' },
  'gmail': { url: 'googlegmail://', pkg: 'com.google.android.gm', web: 'https://gmail.com' },
  'play store': { url: 'market://', pkg: 'com.android.vending', web: 'https://play.google.com' },
  'store': { url: 'market://', pkg: 'com.android.vending', web: 'https://play.google.com' }
};

export async function executeMobileAppLaunchCommand(userPrompt) {
  const prompt = userPrompt.trim();
  const lower = prompt.toLowerCase();

  // If the query contains coding or detailed requests, pass to AI engine instead of app launcher
  const hasCodeOrQueryIntent = ['code', 'html', 'css', 'js', 'javascript', 'python', 'script', 'function', 'file', 'write', 'create', 'generate', 'build', 'solve', 'explain', 'in collab', 'in colab'].some(k => lower.includes(k));
  const isDirectColabLaunch = lower === 'open colab' || lower === 'open google colab' || lower === 'open collab' || lower === 'open google collab';
  
  if (hasCodeOrQueryIntent && !isDirectColabLaunch) {
    return null;
  }

  const isLaunchIntent =
    lower.startsWith('run ') ||
    lower.startsWith('open ') ||
    lower.startsWith('start ') ||
    lower.startsWith('launch ') ||
    lower.includes('open app') ||
    lower.includes('launch app');

  if (!isLaunchIntent) return null;

  const appName = lower
    .replace(/run|open|start|launch|software|app|application|the|please/gi, ' ')
    .trim();

  if (!appName || appName.length < 2) return null;

  const schemeInfo = MOBILE_APP_SCHEMES[appName];

  try {
    if (schemeInfo) {
      if (schemeInfo.pkg) {
        const canOpen = await AppLauncher.canOpenUrl({ url: schemeInfo.pkg });
        if (canOpen.value) {
          await AppLauncher.openUrl({ url: schemeInfo.pkg });
          return `### 🚀 App Launched on Mobile!\n- **App**: \`${appName}\`\n- **Package**: \`${schemeInfo.pkg}\` \n\nULTRON successfully launched **${appName}** on your phone!`;
        }
      }

      if (schemeInfo.url) {
        const canOpenUrl = await AppLauncher.canOpenUrl({ url: schemeInfo.url });
        if (canOpenUrl.value) {
          await AppLauncher.openUrl({ url: schemeInfo.url });
          return `### 🚀 App Launched on Mobile!\n- **App**: \`${appName}\`\n- **URI**: \`${schemeInfo.url}\` \n\nULTRON successfully launched **${appName}** on your phone!`;
        }
      }
    }

    // Do NOT generate random .com navigation for multi-word non-app queries
    if (!schemeInfo && (appName.includes(' ') || !/^[a-z0-9-]+$/i.test(appName))) {
      return null;
    }

    const generalUrl = schemeInfo?.web || `https://${encodeURIComponent(appName)}.com`;
    await AppLauncher.openUrl({ url: generalUrl });
    return `### 🌐 Opening App / URL on Mobile\n- **Target**: \`${appName}\`\n- **Action**: Navigated via intent (\`${generalUrl}\`).`;
  } catch (err) {
    console.warn('[MobileAppLauncher] App launch error:', err);
    return null;
  }
}

export async function openExternalUrl(targetUrl) {
  try {
    const canOpen = await AppLauncher.canOpenUrl({ url: targetUrl });
    if (canOpen.value) {
      await AppLauncher.openUrl({ url: targetUrl });
      return true;
    }
  } catch (err) {
    console.warn('[openExternalUrl] Capacitor launch fallback:', err);
  }
  try {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return true;
  } catch (err) {
    console.warn('[openExternalUrl] window.open error:', err);
    return false;
  }
}

export async function copyToClipboardAndOpenColab(codeToCopy) {
  if (codeToCopy) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeToCopy);
      }
    } catch (err) {
      console.warn('[Clipboard] Copy error:', err);
    }
  }
  return openExternalUrl('https://colab.research.google.com/#create=true');
}
