import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Mic, MicOff, Loader2, Copy, Check, Sparkles, Minus, Maximize2, Minimize2, X, Terminal, MessageSquare,
  Paperclip, Volume2, Bookmark, Eye, Brain, Clock, ChevronDown, Plus, ExternalLink, Activity, Target,
  Globe, Download, Trash2
} from 'lucide-react';
import { generateAIResponse } from '../services/aiService';
import { startVoiceRecognition, stopVoiceRecognition, isVoiceAvailable } from '../services/voiceService';
import { speakText } from '../services/voiceTtsService';
import { BOTS } from '../data/botsData';
import MarkdownRenderer from './MarkdownRenderer';

const MIC_STATES = { idle: 'idle', ready: 'ready', listening: 'listening', processing: 'processing' };

export default function ChatDrawer({ activeAgent, setActiveAgent, onSwitchTab, speechTriggerText }) {
  const activeBotObj = BOTS.find(b => b.id === activeAgent) || BOTS[0];
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ultron_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 1,
        sender: 'ULTRON',
        botName: activeBotObj.name,
        isWelcome: true,
        text: `Welcome to **ULTRON Swarm (2026 Core)**\n\nI'm your next-generation AI companion powered by frontier intelligence.\n- **Frontier AI Engines**: Google Gemini 3.8 Flash & DeepSeek-R1 / LLaMA 3.3 via NVIDIA NIM.\n- **Interactive Code Sandboxes**: Click **Run** on any Python or JavaScript code block to execute directly in your local environment.\n- **Live Web Grounding**: Real-time Google Search grounding with verified citations (toggle via the 🌐 Globe button).\n- **Interactive RAG & Memory**: Continuous learning engine with local document semantic search.\n- **PC Software Automation**: Launch your desktop software by voice or text command.\n- **Voice Ready**: Press **⌘⇧Space** or click the mic button to speak.`
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
  const messagesEndRef = useRef(null);
  const processedSpeechTsRef = useRef(null);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const activeAgentRef = useRef(activeAgent);
  activeAgentRef.current = activeAgent;
  const activeBotNameRef = useRef(activeBotObj.name);
  activeBotNameRef.current = activeBotObj.name;

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
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender, text, botName, ...extraProps }]);
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
    } catch (err) {
      addMessage('ULTRON', `⚠️ Error: ${err.message}`, activeBotNameRef.current);
    } finally {
      setLoading(false);
    }
  }, [input, addMessage, onSwitchTab, webSearchEnabled]);

  useEffect(() => {
    if (
      speechTriggerText &&
      speechTriggerText.text &&
      speechTriggerText.ts !== processedSpeechTsRef.current
    ) {
      processedSpeechTsRef.current = speechTriggerText.ts;
      handleSend(speechTriggerText.text);
    }
  }, [speechTriggerText, handleSend]);

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
    } else if (error && error !== 'No speech match found') {
      addMessage('ULTRON', `🎤 Voice error: ${error}\n\nTip: Ensure offline voice model is downloaded in Settings.`, activeBotObj.name);
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

  const handleClearChat = () => {
    if (window.confirm("Clear conversation history?")) {
      const resetMessages = [
        {
          id: 1,
          sender: 'ULTRON',
          botName: activeBotObj.name,
          isWelcome: true,
          text: `Chat history cleared.\n\nReady for your next query or command!`
        }
      ];
      setMessages(resetMessages);
      localStorage.setItem('ultron_chat_history', JSON.stringify(resetMessages));
    }
  };

  const quickBots = BOTS;

  const handleClose = () => {
    setIsMinimized(true);
    if (onSwitchTab) onSwitchTab(null);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-emerald-600 text-white shadow-2xl hover:bg-emerald-500 transition-all flex items-center gap-2 border border-emerald-400 cursor-pointer pointer-events-auto"
        title="Open Chat Drawer"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-xs font-bold font-mono">ULTRON</span>
      </button>
    );
  }

  return (
    <div
      className={`glass-panel border border-slate-800/80 bg-[#080a14]/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col transition-all duration-300 pointer-events-auto z-50 overflow-hidden relative ${
        isExpanded
          ? 'fixed top-14 bottom-3 inset-x-2 sm:top-14 sm:bottom-6 sm:left-10 sm:right-10 z-50'
          : 'fixed top-14 bottom-3 inset-x-2 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-[440px] sm:h-[620px] sm:max-h-[85vh] z-50'
      }`}
    >
      {/* Top Drag Handle Bar */}
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto my-1.5 flex-shrink-0 cursor-grab active:cursor-grabbing" />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-slate-800/70 bg-slate-950/90 flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* ULTRON Status Pill */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ULTRON AI</span>
          </div>

          {/* Web Search Active Pill */}
          {webSearchEnabled && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 text-[10px] font-semibold">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>Web Grounding Active</span>
            </div>
          )}
        </div>

        {/* Right Window Action Buttons (Export, Clear, Expand, Close) */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={handleExportChat}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Export Chat History as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? "Restore Size" : "Expand Full Screen"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Chat Screen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bot Selector Pills Row */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#090c15] border-b border-slate-800/60 overflow-x-auto no-scrollbar flex-shrink-0">
        {quickBots.map((bot) => {
          const isSelected = activeAgent === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => setActiveAgent(bot.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/70 text-emerald-100 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Target className="w-3 h-3 text-emerald-400" />
              <span>{bot.shortName}</span>
            </button>
          );
        })}
      </div>

      {/* Left Edge Drawer Toggle Handle */}
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('toggle-fleet-sidebar'));
        }}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-14 bg-slate-900/90 border-r border-y border-emerald-500/40 rounded-r-xl flex items-center justify-center text-emerald-400 hover:bg-emerald-950 cursor-pointer z-20 shadow-md transition-all hover:w-5"
        title="Open 11-Bot Fleet Sidebar"
      >
        <span className="text-[10px] font-bold">&gt;</span>
      </button>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 font-sans">
        {messages.map((m) => {
          const isUser = m.sender === 'User';
          return (
            <div key={m.id} className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {/* Left Avatar for NEMI Bot */}
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/60 flex items-center justify-center font-bold text-xs text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] flex-shrink-0 mt-0.5 select-none">
                  N
                </div>
              )}

              {/* Message Content Body */}
              {isUser ? (
                <div className="max-w-[88%] flex flex-col items-end gap-1">
                  <div className="bg-[#0c2420] border border-emerald-500/50 text-emerald-100 rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-md">
                    {m.text}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <button onClick={() => copyToClipboard(m.id, m.text)} className="hover:text-slate-300 cursor-pointer">
                      {copiedId === m.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span>{new Date(m.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Now'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 max-w-[92%] flex flex-col gap-1">
                  <div className="bg-[#0c0d19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl text-xs space-y-2 text-slate-100">
                    {m.isWelcome ? (
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-emerald-400">Welcome to ULTRON Swarm (2026 Core)</h3>
                        <p className="text-slate-300">I'm your next-generation desktop AI companion.</p>
                        <ul className="space-y-1.5 pt-1 text-slate-200">
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>Frontier AI Engines</strong>: Google Gemini 3.8 Flash & DeepSeek-R1 / LLaMA 3.3.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>Interactive Code Sandboxes</strong>: Click <strong>Run</strong> on any Python or JS code block.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>Live Web Grounding</strong>: Google Search grounding with verified citations.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>Interactive RAG & Memory</strong>: Dual-tab memory bank with local document semantic search.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>PC Software Automation</strong>: Launch installed software on PC by voice or command.</span>
                          </li>
                        </ul>
                      </div>
                    ) : (
                      <MarkdownRenderer content={m.text} />
                    )}
                  </div>

                  {/* Message Action Footer */}
                  <div className="flex items-center gap-2 pl-2 text-[10px] text-slate-500">
                    <button
                      onClick={() => copyToClipboard(m.id, m.text)}
                      className="hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === m.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => speakText(m.text)}
                      className="hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                      title="Listen to message voice"
                    >
                      <Volume2 className="w-3 h-3 text-slate-400" />
                      <span>Speak</span>
                    </button>
                    <span>•</span>
                    <span className="font-mono text-emerald-400/70">{m.botName || activeBotObj.name}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {partialText && (
          <div className="self-end max-w-[85%] p-2.5 rounded-2xl text-xs bg-slate-900/80 text-emerald-300 border border-emerald-800/40 italic">
            🎤 Listening: "{partialText}"
          </div>
        )}

        {loading && (
          <div className="self-start bg-slate-950/90 border border-emerald-900/60 p-3 rounded-2xl text-xs text-emerald-400 flex items-center gap-2 shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>ULTRON [{activeBotObj.shortName}] processing response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Floating Input Container */}
      <div className="p-3 bg-[#080c14]/95 border-t border-slate-800/80 rounded-b-3xl flex flex-col gap-1.5 flex-shrink-0 relative">
        {/* Scroll down button floating over top right of input container */}
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute -top-3.5 right-4 w-7 h-7 rounded-full bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center shadow-lg cursor-pointer z-10"
          title="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Input Pill Bar */}
        <div className="bg-[#0b1319] border border-emerald-900/60 rounded-full px-3.5 py-2 flex items-center gap-2.5 shadow-inner focus-within:border-emerald-500/80 transition-all">
          {/* Live Web Grounding Toggle */}
          <button
            type="button"
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`cursor-pointer flex-shrink-0 p-1 rounded-full transition-colors ${
              webSearchEnabled 
                ? 'text-cyan-300 bg-cyan-950/60 shadow-[0_0_8px_rgba(6,182,212,0.5)]' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={webSearchEnabled ? "Live Web Search Grounding: ON" : "Live Web Search Grounding: OFF (Click to enable)"}
          >
            <Globe className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={webSearchEnabled ? "Search web with Gemini 3.8 Grounding..." : activeBotObj.placeholder}
            className="flex-1 min-w-0 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => speakText(input || "ULTRON active")}
            className="text-slate-400 hover:text-emerald-400 cursor-pointer flex-shrink-0"
            title="Voice preview"
          >
            <Volume2 className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={handleVoice}
            aria-label={micState === MIC_STATES.idle ? "Start voice recognition" : "Stop voice recognition"}
            title={micState === MIC_STATES.idle ? "Voice input (Speak now)" : "Stop listening"}
            className={`p-1 rounded-full transition-all cursor-pointer flex-shrink-0 ${
              micState !== MIC_STATES.idle ? 'text-red-400 animate-pulse' : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            {micState !== MIC_STATES.idle ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-30 cursor-pointer flex-shrink-0"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-footer Line Below Input */}
        <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activeBotObj.name}</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-400/80">
            <Brain className="w-3 h-3" />
            <span>{memoryCount} memories loaded</span>
          </span>
        </div>
      </div>
    </div>
  );
}
