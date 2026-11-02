import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Mic, MicOff, Loader2, Copy, Check, Sparkles, Minus, Maximize2, Minimize2, X, Terminal, MessageSquare,
  Paperclip, Volume2, VolumeX, Bookmark, Eye, Brain, Clock, ChevronDown, Plus, ExternalLink, Activity, Target,
  Globe, Download, Trash2, ChevronRight, Bot, Database, RefreshCw
} from 'lucide-react';
import { generateAIResponse } from '../services/aiService';
import { startVoiceRecognition, stopVoiceRecognition, isVoiceAvailable } from '../services/voiceService';
import { speakText, stopSpeech } from '../services/voiceTtsService';
import { BOTS } from '../data/botsData';
import MarkdownRenderer from './MarkdownRenderer';
import { saveMessageToDatabase, fetchUserChatHistory, syncChatHistoryWithDatabase, clearUserChatHistory } from '../services/chatHistoryService';
import { checkDbStatus, getCurrentUser } from '../services/authService';

const MIC_STATES = { idle: 'idle', ready: 'ready', listening: 'listening', processing: 'processing' };
let lastGlobalProcessedSpeechTs = Date.now();

/**
 * Intelligent narration policy router:
 * - Directly starts music/media with ZERO speech narration.
 * - Suppresses voice for silent operational commands (switching tabs, opening apps, file creation).
 * - Speaks aloud ONLY when the user asks a question, requests information, or explicitly asks for narration.
 */
function shouldNarrateResponse(userPrompt, botReply) {
  if (!userPrompt) return false;
  const prompt = userPrompt.toLowerCase().trim();
  const reply = (botReply || '').toLowerCase();

  // 1. Explicitly requested narration ("narrate this", "speak result", "bol ke batao", "sunao")
  const isExplicitNarration = /\b(narrate|speak|read|read aloud|read out|voice|bol ke|bolke|sunao|awaz me|padh ke|tell me aloud)\b/i.test(prompt);
  if (isExplicitNarration) return true;

  // 2. NEVER narrate music/media playback (directly start music without chat screen narration)
  const isMusicAction = 
    /^(?:play|start|baja|bajao|suna|sunao|pause|resume|stop|halt|next|prev|skip)\b/i.test(prompt) ||
    /\b(song|songs|music|track|gana|gaana|geet|beats?|mashup)\b/i.test(prompt);
  const isMusicReply = 
    reply.includes('ultron music player') || 
    reply.includes('playing media') || 
    reply.includes('direct music playback active') ||
    reply.includes('music paused') ||
    reply.includes('music resumed');
  if (isMusicAction || isMusicReply) {
    return false;
  }

  // 3. Silent system / tool commands (open software, switch tab, create file)
  const isSilentCommand = /^(?:open|launch|switch to|create file|create folder|delete file|list files)\b/i.test(prompt);
  if (isSilentCommand) {
    return false;
  }

  // 4. Questions or conversational inquiries ("use narration when i ask something")
  const isQuestion = 
    prompt.includes('?') ||
    /\b(who|what|where|when|why|how|which|whose|whom|can you|could you|explain|describe|tell me|meaning|difference|details|search|find|give me)\b/i.test(prompt) ||
    /\b(kya|kaise|kyun|kyu|kaun|kidhar|kahan|kab|batao|samjhao|bata|bataiye|dikhao)\b/i.test(prompt) ||
    /^(?:hello|hi|hey|greetings|namaste|suno|arre)\b/i.test(prompt) ||
    /\b(joke|fact|trivia|help)\b/i.test(prompt);

  return isQuestion;
}

export default function ChatDrawer({ activeAgent, setActiveAgent, onSwitchTab, speechTriggerText, onClearSpeechTrigger }) {
  const activeBotObj = BOTS.find(b => b.id === activeAgent) || BOTS[0];
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ultron_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy error artifacts and strip legacy youtube blocks from past music queries
          // Only explicit video messages (with '### 🎬 Playing Video') should retain video blocks
          const cleaned = parsed.map(m => {
            if (typeof m.text === 'string' && m.text.includes('```youtube') && !m.text.includes('### 🎬 Playing Video')) {
              return {
                ...m,
                text: m.text.replace(/```youtube[\s\S]*?```/g, '').replace(/\[▶️ (?:Click here to open|Open).*?\]\(.*?\)/g, '').trim()
              };
            }
            return m;
          }).filter(m => 
            !m.text?.includes('Speech-to-text service is unavailable') &&
            !m.text?.includes('offline voice model') &&
            !m.text?.includes('Voice error:')
          );
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch (e) {}
    return [
      {
        id: 1,
        sender: 'ULTRON',
        botName: activeBotObj.name,
        isWelcome: true,
        text: `Welcome to **ULTRON Swarm (2026 Core)**\n\nI'm your next-generation desktop AI companion.\n- **Frontier AI Engines**: Google Gemini 3.8 Flash & DeepSeek-R1 / LLaMA 3.3.\n- **Live Web Grounding**: Search the open web with live citations (click 🌐 below).\n- **Interactive Code Sandboxes**: Click **Run** on any Python or JS code block to execute locally.\n- **PC Software Automation**: Say *"open Chrome"*, *"launch VS Code"*, or *"open Spotify"*.\n- **Voice Ready**: Press **⌘⇧Space** or click the mic button to speak.`
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [micState, setMicState] = useState(MIC_STATES.idle);
  const [partialText, setPartialText] = useState('');
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [memoryCount, setMemoryCount] = useState(4);
  const [isTtsEnabled, setIsTtsEnabled] = useState(() => localStorage.getItem('ultron_tts_enabled') !== 'false');
  const [isUltronTalking, setIsUltronTalking] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, engine: 'Detecting...' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const messagesEndRef = useRef(null);
  const processedSpeechTsRef = useRef(null);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const activeAgentRef = useRef(activeAgent);
  activeAgentRef.current = activeAgent;
  const activeBotNameRef = useRef(activeBotObj.name);
  activeBotNameRef.current = activeBotObj.name;

  // Query database status and sync history on mount & auth change
  useEffect(() => {
    checkDbStatus().then(status => {
      if (status) setDbStatus(status);
    });

    const loadAndSyncHistory = async () => {
      try {
        const remoteMessages = await fetchUserChatHistory();
        if (Array.isArray(remoteMessages) && remoteMessages.length > 0) {
          setMessages(remoteMessages);
        }
      } catch (err) {
        console.warn('[ChatDrawer] Auto-sync history notice:', err);
      }
    };

    loadAndSyncHistory();

    const handleHistorySynced = (e) => {
      if (e.detail?.messages && Array.isArray(e.detail.messages)) {
        setMessages(e.detail.messages);
      }
    };

    const handleAuthChange = () => {
      loadAndSyncHistory();
      checkDbStatus().then(status => {
        if (status) setDbStatus(status);
      });
    };

    window.addEventListener('ultron-history-synced', handleHistorySynced);
    window.addEventListener('ultron-auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('ultron-history-synced', handleHistorySynced);
      window.removeEventListener('ultron-auth-change', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const onStart = () => setIsUltronTalking(true);
    const onEnd = () => setIsUltronTalking(false);
    window.addEventListener('ultron-speaking-start', onStart);
    window.addEventListener('ultron-speaking-end', onEnd);
    return () => {
      window.removeEventListener('ultron-speaking-start', onStart);
      window.removeEventListener('ultron-speaking-end', onEnd);
    };
  }, []);

  useEffect(() => {
    try {
      const mems = localStorage.getItem('ultron_memory_bank');
      if (mems) {
        const parsed = JSON.parse(mems);
        if (Array.isArray(parsed)) setMemoryCount(parsed.length);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ultron_chat_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    isVoiceAvailable().then(setVoiceAvailable);
  }, []);

  useEffect(() => {
    setIsMinimized(false);
  }, [activeAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const addMessage = useCallback((sender, text, botName = activeBotObj.name, extraProps = {}) => {
    const newMsg = { id: Date.now() + Math.random(), sender, text, botName, ...extraProps };
    setMessages(prev => [...prev, newMsg]);
    saveMessageToDatabase(newMsg).catch(() => {});
  }, [activeBotObj.name]);

  const handleSend = useCallback(async (textOverride) => {
    let userText = (textOverride ?? input).trim();
    if (!userText || loadingRef.current) return;
    setInput('');
    setPartialText('');

    if (webSearchEnabled && !userText.toLowerCase().includes('search')) {
      userText = `[Web Search Active] ${userText}`;
    }

    addMessage('User', userText);
    setLoading(true);

    try {
      const response = await generateAIResponse(userText, activeAgentRef.current, { onSwitchTab, webSearch: webSearchEnabled });
      const reply = response || 'Command executed.';
      addMessage('ULTRON', reply, activeBotNameRef.current);

      // Speak response using high-definition natural voice only when appropriate (questions/explicit requests)
      // Directly start music without chat screen narration
      const ttsEnabled = localStorage.getItem('ultron_tts_enabled') !== 'false';
      if (ttsEnabled && shouldNarrateResponse(userText, reply)) {
        speakText(reply, { isAutoSpoken: true });
      }
    } catch (err) {
      addMessage('ULTRON', `⚠️ Error: ${err.message}`, activeBotNameRef.current);
    } finally {
      setLoading(false);
    }
  }, [input, addMessage, onSwitchTab, webSearchEnabled]);

  // Proactively purge any cached legacy voice error messages or duplicate youtube embeds from music commands
  useEffect(() => {
    setMessages(prev => {
      const needsCleanup = prev.some(m => 
        m.text?.includes('Speech-to-text service is unavailable') ||
        m.text?.includes('offline voice model') ||
        m.text?.includes('Voice error:') ||
        (typeof m.text === 'string' && m.text.includes('```youtube') && !m.text.includes('### 🎬 Playing Video'))
      );
      if (!needsCleanup) return prev;
      const purged = prev.map(m => {
        if (typeof m.text === 'string' && m.text.includes('```youtube') && !m.text.includes('### 🎬 Playing Video')) {
          return {
            ...m,
            text: m.text.replace(/```youtube[\s\S]*?```/g, '').replace(/\[▶️ (?:Click here to open|Open).*?\]\(.*?\)/g, '').trim()
          };
        }
        return m;
      }).filter(m => 
        !m.text?.includes('Speech-to-text service is unavailable') &&
        !m.text?.includes('offline voice model') &&
        !m.text?.includes('Voice error:')
      );
      return purged.length > 0 ? purged : [
        {
          id: 1,
          sender: 'ULTRON',
          botName: activeBotObj.name,
          isWelcome: true,
          text: `Welcome to **ULTRON Swarm (2026 Core)**\n\nI'm your next-generation desktop AI companion.\n- **Frontier AI Engines**: Google Gemini 3.8 Flash & DeepSeek-R1 / LLaMA 3.3.\n- **Live Web Grounding**: Search the open web with live citations (click 🌐 below).\n- **Interactive Code Sandboxes**: Click **Run** on any Python or JS code block to execute locally.\n- **PC Software Automation**: Say *"open Chrome"*, *"launch VS Code"*, or *"open Spotify"*.\n- **Voice Ready**: Press **⌘⇧Space** or click the mic button to speak.`
        }
      ];
    });
  }, [activeBotObj.name]);

  // Execute speech recognition triggers safely without duplicate replay on re-opening drawer
  useEffect(() => {
    if (
      speechTriggerText &&
      speechTriggerText.text &&
      speechTriggerText.ts &&
      speechTriggerText.ts > lastGlobalProcessedSpeechTs &&
      Date.now() - speechTriggerText.ts < 3500
    ) {
      lastGlobalProcessedSpeechTs = speechTriggerText.ts;
      const textToSend = speechTriggerText.text;
      if (onClearSpeechTrigger) {
        onClearSpeechTrigger();
      }
      handleSend(textToSend);
    }
  }, [speechTriggerText, handleSend, onClearSpeechTrigger]);

  // Cleanly stop any ongoing speech when drawer mounts or unmounts to prevent re-speaking old queries
  useEffect(() => {
    stopSpeech();
    return () => {
      stopSpeech();
      if (onClearSpeechTrigger) {
        onClearSpeechTrigger();
      }
    };
  }, [onClearSpeechTrigger]);

  const handleVoice = useCallback(async () => {
    if (micState !== MIC_STATES.idle) {
      await stopVoiceRecognition();
      setMicState(MIC_STATES.idle);
      setPartialText('');
      return;
    }

    setMicState(MIC_STATES.ready);
    setPartialText('');

    const { transcript, error } = await startVoiceRecognition({
      onStatus: (status) => setMicState(MIC_STATES[status] || MIC_STATES.listening),
      onPartial: (partial) => setPartialText(partial),
    });

    setMicState(MIC_STATES.idle);
    setPartialText('');

    if (transcript && transcript.trim()) {
      setInput('');
      await handleSend(transcript);
    } else if (error && error !== 'No speech match found' && error !== 'no-speech' && error !== 'aborted') {
      console.warn('[ChatDrawer] Voice input ended:', error);
      if (error === 'Microphone permission denied') {
        const isInsecure = typeof window !== 'undefined' && 
          !window.isSecureContext && 
          window.location.hostname !== 'localhost' && 
          window.location.hostname !== '127.0.0.1';
        if (isInsecure) {
          addMessage('ULTRON', `🎤 **Microphone blocked by Chrome**: Android Chrome forbids microphone access over HTTP. Please access via **HTTPS** (\`https://${window.location.hostname}:5173\`) or allow this IP in \`chrome://flags/#unsafely-treat-insecure-origin-as-secure\`.`, activeBotObj.name);
        } else {
          addMessage('ULTRON', `🎤 Microphone permission was denied. Tap the tune/lock icon in your browser address bar to allow microphone access.`, activeBotObj.name);
        }
      }
    }
  }, [micState, activeBotObj.name, handleSend, addMessage]);

  const copyToClipboard = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChat = () => {
    const markdownContent = messages.map(m => `### ${m.sender} (${m.botName || 'System'})\n\n${m.text}\n\n---\n`).join('\n');
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ULTRON_Chat_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Syncing PostgreSQL...');
    try {
      const res = await syncChatHistoryWithDatabase(messages);
      if (res && res.success && Array.isArray(res.messages) && res.messages.length > 0) {
        setMessages(res.messages);
        setSyncStatusMsg(`Synced (${res.messages.length} msgs) ✓`);
      } else {
        setSyncStatusMsg('Synced ✓');
      }
      checkDbStatus().then(st => st && setDbStatus(st));
    } catch (e) {
      setSyncStatusMsg('Sync error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(''), 2500);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm("Clear conversation history from PostgreSQL and local cache?")) {
      await clearUserChatHistory();
      const resetMessages = [
        {
          id: 1,
          sender: 'ULTRON',
          botName: activeBotObj.name,
          isWelcome: true,
          text: `Chat history cleared from database.\n\nReady for your next query or command!`
        }
      ];
      setMessages(resetMessages);
      localStorage.setItem('ultron_chat_history', JSON.stringify(resetMessages));
    }
  };

  const handleClose = () => {
    stopSpeech();
    if (onClearSpeechTrigger) {
      onClearSpeechTrigger();
    }
    setIsMinimized(true);
    if (onSwitchTab) onSwitchTab(null);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-full bg-slate-950/90 backdrop-blur-md hover:bg-slate-900 text-white border border-white/10 shadow-xl transition-all flex items-center gap-2 cursor-pointer pointer-events-auto active:scale-95 text-xs font-medium"
        title="Open Chat"
      >
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <span>Chat</span>
      </button>
    );
  }

  return (
    <aside
      className={`fixed z-50 flex flex-col transition-all duration-200 pointer-events-auto overflow-hidden
        bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)]
        ${isExpanded
          ? 'top-14 bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-[720px]'
          : 'top-14 bottom-4 right-3 sm:right-6 w-[450px] max-w-[calc(100vw-1.5rem)]'
        }`}
      aria-label="Ultron Chat Interface"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-white">Ultron</span>

          {/* Web Search Grounding Active Badge */}
          {webSearchEnabled && (
            <span className="text-[11px] font-medium text-slate-300 border border-slate-700/80 rounded-md px-2 py-0.5 bg-slate-800/80">
              Web Search
            </span>
          )}

          {/* Database Sync Status */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono border border-white/10 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors cursor-pointer"
            title="Database sync status. Click to sync now."
          >
            <span>{syncStatusMsg || (dbStatus.connected ? 'PostgreSQL' : dbStatus.engine ? dbStatus.engine.replace(' (Local Fallback)', '') : 'Local')}</span>
            <RefreshCw className={`w-2.5 h-2.5 text-slate-400 ${isSyncing ? 'animate-spin text-slate-200' : ''}`} />
          </button>
        </div>

        {/* Right Window Action Icons */}
        <div className="flex items-center gap-1 text-slate-400">
          {/* Voice Output Audio Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isUltronTalking) {
                stopSpeech();
              } else {
                const next = !isTtsEnabled;
                setIsTtsEnabled(next);
                localStorage.setItem('ultron_tts_enabled', next ? 'true' : 'false');
              }
            }}
            className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center ${
              isUltronTalking
                ? 'text-white bg-slate-800'
                : isTtsEnabled
                ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/40'
            }`}
            title={
              isUltronTalking
                ? "Ultron is speaking. Click to silence"
                : isTtsEnabled
                ? "Voice output enabled (Click to mute)"
                : "Voice output muted (Click to unmute)"
            }
          >
            {isUltronTalking ? (
              <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" />
            ) : isTtsEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleExportChat}
            className="p-1.5 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
            title="Export Chat History as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 hover:text-rose-400 hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
            title={isExpanded ? "Restore Size" : "Expand Size"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Specialist Model Selector Row */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-950/70 border-b border-white/5 overflow-x-auto no-scrollbar flex-shrink-0">
        {BOTS.map((bot) => {
          const isSelected = activeAgent === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => setActiveAgent(bot.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 text-white border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <span>{bot.shortName}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 font-sans bg-slate-950/80">
        {messages.map((m) => {
          const isUser = m.sender === 'User';
          return (
            <div key={m.id} className={`flex items-start ${isUser ? 'justify-end' : 'justify-start'}`}>
              {/* Message Content Bubble */}
              {isUser ? (
                <div className="max-w-[85%] flex flex-col items-end gap-1">
                  <div className="bg-slate-800/90 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm border border-slate-700/60">
                    {m.text}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pr-1">
                    <button onClick={() => copyToClipboard(m.id, m.text)} className="hover:text-slate-300 transition-colors cursor-pointer">
                      {copiedId === m.id ? 'Copied' : 'Copy'}
                    </button>
                    <span>{new Date(m.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Now'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 max-w-[95%] flex flex-col gap-1.5">
                  <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-200">
                    {m.isWelcome ? (
                      <div className="space-y-2.5 text-slate-300 text-sm">
                        <h3 className="text-sm font-semibold text-white tracking-tight">Ultron Intelligence</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">Next-generation desktop companion with autonomous intelligence and local execution.</p>
                        <ul className="space-y-1.5 pt-1 text-xs text-slate-300">
                          <li className="flex items-start gap-2">
                            <span className="text-slate-500 font-mono">•</span>
                            <span><strong>Engines</strong>: Google Gemini 3.8 Flash & DeepSeek-R1 / LLaMA 3.3</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-slate-500 font-mono">•</span>
                            <span><strong>Grounding</strong>: Live web search with verified citations</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-slate-500 font-mono">•</span>
                            <span><strong>Execution</strong>: Run Python and JavaScript code sandboxes locally</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-slate-500 font-mono">•</span>
                            <span><strong>System Control</strong>: Launch applications and control system operations</span>
                          </li>
                        </ul>
                      </div>
                    ) : (
                      <MarkdownRenderer content={m.text} />
                    )}
                  </div>

                  {/* Message Action Footer */}
                  <div className="flex items-center gap-2 pl-1 text-[11px] text-slate-500">
                    <button
                      onClick={() => copyToClipboard(m.id, m.text)}
                      className="hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {copiedId === m.id ? 'Copied' : 'Copy'}
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => {
                        if (isUltronTalking) {
                          stopSpeech();
                        } else {
                          speakText(m.text);
                        }
                      }}
                      className="hover:text-slate-300 transition-colors cursor-pointer"
                      title={isUltronTalking ? "Stop voice" : "Listen to message"}
                    >
                      <span>{isUltronTalking ? 'Stop' : 'Listen'}</span>
                    </button>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{m.botName || activeBotObj.name}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {partialText && (
          <div className="self-end max-w-[85%] px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-300 italic">
            Listening: "{partialText}"
          </div>
        )}

        {loading && (
          <div className="self-start bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-400 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            <span>Generating response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 bg-slate-950/95 backdrop-blur-md border-t border-white/10 rounded-b-2xl flex flex-col gap-2 flex-shrink-0 relative">
        {/* Scroll down button */}
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute -top-3.5 right-4 w-6 h-6 rounded-full bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center shadow-lg cursor-pointer z-10"
          title="Scroll to latest"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Input Bar */}
        <div className="bg-slate-900/80 border border-slate-800 focus-within:border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 transition-colors">
          {/* Live Web Grounding Toggle */}
          <button
            type="button"
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`cursor-pointer flex-shrink-0 p-1.5 rounded-md transition-colors ${
              webSearchEnabled 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={webSearchEnabled ? "Live Web Search: Active" : "Enable Web Search"}
          >
            <Globe className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={webSearchEnabled ? "Search web live..." : (activeBotObj.placeholder || "Ask Ultron anything...")}
            className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-normal"
          />

          <button
            type="button"
            onClick={handleVoice}
            aria-label={micState === MIC_STATES.idle ? "Start voice recognition" : "Stop voice recognition"}
            title={micState === MIC_STATES.idle ? "Voice input" : "Stop listening"}
            className={`p-1.5 rounded-md transition-colors cursor-pointer flex-shrink-0 ${
              micState !== MIC_STATES.idle 
                ? 'bg-red-950 text-red-400 animate-pulse' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {micState !== MIC_STATES.idle ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-3 py-1.5 bg-white text-slate-950 font-medium hover:bg-slate-200 disabled:opacity-25 disabled:hover:bg-white rounded-lg text-xs transition-colors cursor-pointer flex-shrink-0"
            title="Send message"
          >
            Send
          </button>
        </div>

        {/* Sub-footer Line Below Input */}
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-mono">
          <span>{activeBotObj.name}</span>
          <span>{memoryCount} memories</span>
        </div>
      </div>
    </aside>
  );
}
