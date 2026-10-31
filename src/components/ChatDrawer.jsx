import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Mic, MicOff, Loader2, Copy, Check, Sparkles, Minus, Maximize2, Minimize2, X, Terminal, MessageSquare,
  Paperclip, Volume2, Bookmark, Eye, Brain, Clock, ChevronDown, Plus, ExternalLink, Activity, Target,
  Globe, Download, Trash2, ChevronRight, Bot
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

  const handleClose = () => {
    setIsMinimized(true);
    if (onSwitchTab) onSwitchTab(null);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all flex items-center gap-2 border border-cyan-300 cursor-pointer pointer-events-auto active:scale-95"
        title="Open Chat Drawer"
      >
        <MessageSquare className="w-5 h-5 text-white" />
        <span className="text-xs font-bold font-mono tracking-wider">ULTRON CHAT</span>
      </button>
    );
  }

  return (
    <aside
      className={`fixed z-50 flex flex-col transition-all duration-300 pointer-events-auto overflow-hidden
        bg-[#070b18]/95 backdrop-blur-2xl border border-cyan-500/35 rounded-3xl
        shadow-[0_24px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(0,240,255,0.12)]
        ${isExpanded
          ? 'top-14 bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-[720px]'
          : 'top-14 bottom-4 right-3 sm:right-6 w-[450px] max-w-[calc(100vw-1.5rem)]'
        }`}
      aria-label="ULTRON Chat Interface"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-slate-950/80 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Glowing Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 text-[11px] font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="tracking-wide">ULTRON AI</span>
          </div>

          {/* Web Search Grounding Active Badge */}
          {webSearchEnabled && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-400/50 text-sky-200 text-[10px] font-semibold animate-pulse">
              <Globe className="w-3 h-3 text-sky-400" />
              <span>Web Search Active</span>
            </div>
          )}
        </div>

        {/* Right Window Action Icons */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={handleExportChat}
            className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Export Chat History as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? "Restore Size" : "Expand Full Screen"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close Chat Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Specialist Bot Selector Row */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#050814] border-b border-white/5 overflow-x-auto no-scrollbar flex-shrink-0">
        {BOTS.map((bot) => {
          const isSelected = activeAgent === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => setActiveAgent(bot.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Target className="w-3 h-3 text-cyan-400" />
              <span>{bot.shortName}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 font-sans">
        {messages.map((m) => {
          const isUser = m.sender === 'User';
          return (
            <div key={m.id} className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {/* Bot Avatar */}
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/60 flex items-center justify-center font-bold text-xs text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)] flex-shrink-0 mt-0.5 select-none">
                  <Bot className="w-3.5 h-3.5 text-cyan-300" />
                </div>
              )}

              {/* Message Content Bubble */}
              {isUser ? (
                <div className="max-w-[85%] flex flex-col items-end gap-1">
                  <div className="bg-gradient-to-r from-cyan-950/90 to-slate-900/90 border border-cyan-500/40 text-white font-medium rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs sm:text-sm shadow-md">
                    {m.text}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pr-1">
                    <button onClick={() => copyToClipboard(m.id, m.text)} className="hover:text-slate-300 cursor-pointer">
                      {copiedId === m.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span>{new Date(m.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Now'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 max-w-[92%] flex flex-col gap-1">
                  <div className="bg-[#0b1224]/90 border border-slate-800/90 rounded-2xl rounded-tl-sm p-4 shadow-xl text-xs space-y-2 text-slate-100">
                    {m.isWelcome ? (
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-cyan-400">Welcome to ULTRON Swarm (2026 Core)</h3>
                        <p className="text-slate-300">I'm your next-generation desktop AI companion.</p>
                        <ul className="space-y-1.5 pt-1 text-slate-200">
                          <li className="flex items-start gap-1.5">
                            <span className="text-cyan-400 font-bold">&gt;</span>
                            <span><strong>Frontier AI Engines</strong>: Google Gemini 3.8 Flash & DeepSeek-R1 / LLaMA 3.3.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-cyan-400 font-bold">&gt;</span>
                            <span><strong>Live Web Grounding</strong>: Search the open web with verified sources (click 🌐 below).</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-cyan-400 font-bold">&gt;</span>
                            <span><strong>Interactive Code Sandboxes</strong>: Click <strong>Run</strong> on any Python or JS code block.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-cyan-400 font-bold">&gt;</span>
                            <span><strong>PC Software Automation</strong>: Launch installed software on PC by voice or text.</span>
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
                      className="hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
                      title="Listen to message voice"
                    >
                      <Volume2 className="w-3 h-3 text-slate-400" />
                      <span>Speak</span>
                    </button>
                    <span>•</span>
                    <span className="font-mono text-cyan-400/80">{m.botName || activeBotObj.name}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {partialText && (
          <div className="self-end max-w-[85%] p-2.5 rounded-2xl text-xs bg-slate-900/80 text-cyan-300 border border-cyan-800/40 italic flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
            <span>Listening: "{partialText}"</span>
          </div>
        )}

        {loading && (
          <div className="self-start bg-slate-950/90 border border-cyan-900/60 p-3 rounded-2xl text-xs text-cyan-400 flex items-center gap-2 shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>ULTRON [{activeBotObj.shortName}] synthesizing response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 bg-[#050914]/95 border-t border-white/10 rounded-b-3xl flex flex-col gap-1.5 flex-shrink-0 relative">
        {/* Scroll down button */}
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute -top-3.5 right-4 w-7 h-7 rounded-full bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center shadow-lg cursor-pointer z-10"
          title="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Input Pill Bar */}
        <div className="bg-[#030610] border border-cyan-500/40 rounded-full px-3.5 py-2 flex items-center gap-2.5 shadow-inner focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
          {/* Live Web Grounding Toggle */}
          <button
            type="button"
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`cursor-pointer flex-shrink-0 p-1.5 rounded-full transition-all ${
              webSearchEnabled 
                ? 'text-cyan-300 bg-cyan-950/80 shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-cyan-400/50' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
            title={webSearchEnabled ? "Live Web Search Grounding: ACTIVE" : "Click to enable Live Web Search Grounding"}
          >
            <Globe className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={webSearchEnabled ? "Search world wide web live..." : activeBotObj.placeholder}
            className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none font-sans font-medium"
          />

          <button
            type="button"
            onClick={() => speakText(input || "ULTRON active")}
            className="text-slate-400 hover:text-cyan-400 cursor-pointer flex-shrink-0 p-1"
            title="Voice preview"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleVoice}
            aria-label={micState === MIC_STATES.idle ? "Start voice recognition" : "Stop voice recognition"}
            title={micState === MIC_STATES.idle ? "Voice input (Speak now)" : "Stop listening"}
            className={`p-1.5 rounded-full transition-all cursor-pointer flex-shrink-0 ${
              micState !== MIC_STATES.idle ? 'text-red-400 animate-pulse bg-red-950/50' : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40'
            }`}
          >
            {micState !== MIC_STATES.idle ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-1.5 text-cyan-400 hover:text-cyan-300 disabled:opacity-30 cursor-pointer flex-shrink-0 hover:bg-cyan-950/40 rounded-full transition-colors"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-footer Line Below Input */}
        <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{activeBotObj.name}</span>
          </span>
          <span className="flex items-center gap-1 text-cyan-400/80">
            <Brain className="w-3 h-3" />
            <span>{memoryCount} memories loaded</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
