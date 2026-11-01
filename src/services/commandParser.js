/**
 * ULTRON Offline Command Parser
 * Routes voice/text commands to the correct action — NO network required.
 * Returns a structured command result object or string response.
 */

import { createFile, createFolder, listDirectory, openFile, launchApp, openExternalUrl } from './fileSystemService';
import { executeMobileAppLaunchCommand } from './mobileAppLauncherService';

// ──────────────────────────── INTENT PATTERNS ────────────────────────────

const PATTERNS = {
  // File creation:  "create file notes.txt", "make a file called report.pdf"
  CREATE_FILE: [
    /(?:create|make|new|add)\s+(?:a\s+)?file\s+(?:called\s+|named\s+)?["']?([^\s"']+)["']?/i,
    /(?:create|make|new|add)\s+["']?([^\s"']+\.[a-z0-9]{1,6})["']?\s+file/i
  ],

  // Folder creation: "create folder Projects", "make a new folder called Work"
  CREATE_FOLDER: [
    /(?:create|make|new|add)\s+(?:a\s+)?(?:folder|directory|dir)\s+(?:called\s+|named\s+)?["']?([^\s"']+)["']?/i,
    /(?:create|make|new|add)\s+["']?([^\s"']+)["']?\s+(?:folder|directory|dir)/i
  ],

  // Open file: "open file notes.txt", "open notes.txt"
  OPEN_FILE: [
    /open\s+(?:file\s+)?(?:called\s+|named\s+)?["']?([^\s"']+\.[a-z0-9]{1,6})["']?/i,
    /show\s+(?:me\s+)?(?:file\s+)?["']?([^\s"']+\.[a-z0-9]{1,6})["']?/i
  ],

  // List files: "list files", "show files", "show me files in Downloads"
  LIST_FILES: [
    /(?:list|show|display|browse)\s+(?:all\s+)?(?:files?|folders?|contents?|directory)/i,
    /what(?:'s|\s+is|\s+are)\s+(?:in|inside)\s+(?:my\s+)?(?:files?|folder|storage)/i,
    /show\s+(?:me\s+)?(?:my\s+)?(?:files?|folder|storage|documents?)/i,
    /open\s+file\s+manager/i
  ],

  // Tab navigation via voice: "switch to swarm", "open memory"
  NAVIGATE_TAB: [
    /(?:switch\s+to|open|show|go\s+to)\s+(?:the\s+)?(chat|swarm|files|file\s+manager|memory|knowledge)(?:\s+tab|\s+panel)?/i
  ],

  // Media / YouTube playback: "play Kasa song by Honey Singh", "play despacito", "suna koi gaana"
  PLAY_MEDIA: [
    /(?:play|baja|bajao|suna|sunao)\s+(?:a\s+)?(?:song|video|music|track|gaana|gana)?\s*(?:called\s+|named\s+)?(.+)/i,
    /(?:play|baja|bajao)\s+(.+)/i
  ],

  // App launch: "open chrome", "launch notepad", "start software spotify"
  LAUNCH_APP: [
    /(?:open|launch|start|run)\s+(?:the\s+)?(?:app\s+|software\s+|program\s+|application\s+)?(?:called\s+|named\s+)?(.+)/i
  ],

  // Help: "help", "what can you do"
  HELP: [
    /^(?:help|commands?|what can you do|ultron help)$/i
  ]
};

// ──────────────────────────── COMMAND ARGUMENT EXTRACTORS ────────────────────────────

function extract(text, patterns) {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[1]?.trim() || null;
  }
  return null;
}

function testAny(text, patterns) {
  return patterns.some(p => p.test(text));
}

// ──────────────────────────── RESPONSE FORMATTERS ────────────────────────────

function fmt(icon, title, lines = []) {
  return `### ${icon} ${title}\n${lines.map(l => `- ${l}`).join('\n')}`;
}

// ──────────────────────────── MAIN PARSER ────────────────────────────

/**
 * Parse and execute a command string offline.
 * @param {string} rawText - user input (voice or text)
 * @param {object} [context] - optional context hooks e.g. { onSwitchTab, onSelectAgent }
 * @returns {Promise<string|null>} - response markdown string, or null if not handled
 */
export async function parseAndExecuteCommand(rawText, context = {}) {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // ── HELP ──
  if (testAny(lower, PATTERNS.HELP)) {
    return fmt('🤖', 'ULTRON Command Reference', [
      '**"create file [name]"** — Create a file in Downloads/Ultron/',
      '**"create folder [name]"** — Create a folder',
      '**"open [filename.ext]"** — Open a file with system app',
      '**"list files"** — Browse your Ultron files',
      '**"play [song/artist/video]"** — Play media or music on YouTube',
      '**"open [software name]"** — Launch installed software on PC (Chrome, Notepad, Calc, VS Code, etc.)',
      '**"switch to files / swarm / chat / memory / knowledge"** — Voice navigation',
    ]);
  }

  // ── PLAY MEDIA / MUSIC / YOUTUBE ──
  const playTarget = extract(text, PATTERNS.PLAY_MEDIA);
  if (playTarget) {
    const cleanMedia = playTarget
      .replace(/\b(from youtube|on youtube|in youtube|youtube par|youtube se|youtube|song|songs|music|track|video|videos|gana|gaana|geet|play|baja|bajao|suna|sunao)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanMedia.length > 0) {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanMedia)}`;

      // 1. Proactively trigger external launch across Electron, Python OS shell, and browser
      openExternalUrl(ytUrl);

      // 2. Return interactive embedded player + direct clickable link
      return `### 🎵 Playing Media on YouTube\n` +
        `- **Query**: "${cleanMedia}"\n` +
        `- **Status**: Streaming playback initialized.\n` +
        `- Enjoy listening to **${cleanMedia}**.\n\n` +
        `\`\`\`youtube\n${cleanMedia}\n\`\`\`\n\n` +
        `[▶️ Click here to open "${cleanMedia}" on YouTube](${ytUrl})`;
    }
  }

  // ── NAVIGATE TABS VIA VOICE ──
  const navTab = extract(text, PATTERNS.NAVIGATE_TAB);
  if (navTab) {
    let target = navTab.toLowerCase();
    if (target.includes('file')) target = 'files';
    if (context.onSwitchTab) context.onSwitchTab(target);
    return fmt('⚡', 'Navigation Command Executed', [
      `Switched view to **${target.toUpperCase()}**`,
      'Voice control active.'
    ]);
  }

  // ── LIST FILES (show file manager) ──
  if (testAny(text, PATTERNS.LIST_FILES)) {
    if (context.onSwitchTab) context.onSwitchTab('files');
    const result = await listDirectory('');
    if (result.success && result.entries.length > 0) {
      const lines = result.entries.map(e =>
        `${e.isDirectory ? '📁' : '📄'} **${e.name}** ${e.isDirectory ? '' : `(${formatBytes(e.size)}) — ${e.modified}`}`
      );
      return fmt('📂', `Files in Downloads/Ultron/`, lines) + '\n\n*Switched to **File Manager** tab.*';
    }
    return fmt('📂', 'Downloads/Ultron/ is empty', ['Say **"create file test.txt"** to get started!']);
  }

  // ── CREATE FILE ──
  const fileName = extract(text, PATTERNS.CREATE_FILE);
  if (fileName) {
    const inPathMatch = lower.match(/\s+in\s+([^\s]+)$/i);
    const subPath = inPathMatch ? inPathMatch[1] : '';
    const result = await createFile(fileName, subPath);
    if (result.success) {
      return fmt('📄', 'File Created!', [
        `**Name**: \`${result.name}\``,
        `**Path**: \`${result.path}\``,
        'ULTRON successfully created your file on storage.'
      ]);
    }
    return fmt('❌', 'File Creation Failed', [`Error: ${result.message}`]);
  }

  // ── CREATE FOLDER ──
  const folderName = extract(text, PATTERNS.CREATE_FOLDER);
  if (folderName) {
    const inPathMatch = lower.match(/\s+in\s+([^\s]+)$/i);
    const subPath = inPathMatch ? inPathMatch[1] : '';
    const result = await createFolder(folderName, subPath);
    if (result.success) {
      return fmt('📁', 'Folder Created!', [
        `**Name**: \`${result.name}\``,
        `**Path**: \`${result.path}\``,
        'ULTRON created the folder.'
      ]);
    }
    return fmt('❌', 'Folder Creation Failed', [`Error: ${result.message}`]);
  }

  // ── OPEN FILE ──
  const openFileName = extract(text, PATTERNS.OPEN_FILE);
  if (openFileName) {
    const result = await openFile(openFileName);
    if (result.success) {
      return fmt('📂', 'Opening File', [`Opening \`${openFileName}\` with system app...`]);
    }
    return fmt('❌', 'Cannot Open File', [`Error: ${result.message}`]);
  }

  // ── LAUNCH APP / SOFTWARE ──
  const isCodeOrQueryIntent = ['write code', 'create code', 'generate code', 'write script', 'python code', 'javascript code', 'html code', 'css code', 'sql query', 'cpp code', 'java code', 'c++ code', 'build app', 'write function', 'debug code', 'refactor code', 'in colab', 'in collab', 'hello world', 'algorithm'].some(k => lower.includes(k));
  const isDirectColabLaunch = lower === 'open colab' || lower === 'open google colab' || lower === 'open collab' || lower === 'open google collab';

  if (!isCodeOrQueryIntent || isDirectColabLaunch) {
    if (testAny(text, PATTERNS.LAUNCH_APP)) {
      const schemeResult = await executeMobileAppLaunchCommand(text);
      if (schemeResult) return schemeResult;

      const appNameRaw = extract(text, PATTERNS.LAUNCH_APP);
      if (appNameRaw) {
        const cleanName = appNameRaw
          .replace(/\b(app|application|software|program|the|please|now)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleanName.length >= 2) {
          const result = await launchApp(cleanName);
          if (result.success) {
            const dest = result.isDesktop ? 'on your PC' : (result.isWeb ? 'in web browser' : 'on your phone');
            return fmt('🚀', 'Software / App Launched!', [
              `**Software**: \`${cleanName}\``,
              `**Status**: Launched ${dest}`,
              result.message || `ULTRON successfully launched **${cleanName}** ${dest}.`
            ]);
          }
          return fmt('❌', 'Software Launch Failed', [
            `Could not launch software named **"${cleanName}"** on your PC.`,
            `Message: ${result.message || 'App not found in system path.'}`,
            'Ensure the software is installed on your PC or add its folder to your System PATH environment variables.'
          ]);
        }
      }
    }
  }

  return null;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
