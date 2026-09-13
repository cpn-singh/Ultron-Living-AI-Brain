import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Mic, MicOff, Loader2, Copy, Check, Sparkles, Minus, Maximize2, Minimize2, X, Terminal, MessageSquare,
  Paperclip, Volume2, Bookmark, Eye, Brain, Clock, ChevronDown, Plus, ExternalLink, Activity, Target
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
        text: `Welcome to **NEMI**\n\nI'm your next-generation desktop AI companion.\n- **Interactive Chat**: Type your questions, code, or ideas.\n- **Persistent Memory**: I remember your preferences and project details across sessions.\n- **Voice Ready**: Press **⌘⇧Space** or click the mic button to speak.\n- **RAG Connected**: Query your local documents in real-time.`
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [micState, setMicState] = useState(MIC_STATES.idle);
  const [partialText, setPartialText] = useState('');
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
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
      localStorage.setItem('ultron_chat_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    isVoiceAvailable().then(setVoiceAvailable);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const addMessage = useCallback((sender, text, botName = activeBotObj.name, extraProps = {}) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender, text, botName, ...extraProps }]);
  }, [activeBotObj.name]);

  const handleSend = useCallback(async (textOverride) => {
    const userText = (textOverride ?? input).trim();
    if (!userText || loadingRef.current) return;
    setInput('');
    setPartialText('');
    addMessage('User', userText);
    setLoading(true);

    try {
      const response = await generateAIResponse(userText, activeAgentRef.current, { onSwitchTab });
      const reply = response || 'Command executed.';
      addMessage('ULTRON', reply, activeBotNameRef.current);
    } catch (err) {
      addMessage('ULTRON', `⚠️ Error: ${err.message}`, activeBotNameRef.current);
    } finally {
      setLoading(false);
    }
  }, [input, addMessage, onSwitchTab]);

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

  const quickBots = BOTS;

  const handleClose = () => {
    setIsMinimized(true);
    if (onSwitchTab) {
      onSwitchTab(null);
    }
  };

  if (isMinimized) {
    return null;
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
          {/* NEMI Status Pill */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>NEMI</span>
          </div>
        </div>

        {/* Right Window Action Buttons (+, Expand, X) */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Minimize"
          >
            <Plus className="w-3.5 h-3.5" />
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
                    <span>09:43 AM</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 max-w-[92%] flex flex-col gap-1">
                  <div className="bg-[#0c0d19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl text-xs space-y-2 text-slate-100">
                    {m.isWelcome ? (
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-emerald-400">Welcome to NEMI</h3>
                        <p className="text-slate-300">I'm your next-generation desktop AI companion.</p>
                        <ul className="space-y-1.5 pt-1 text-slate-200">
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>Interactive Chat</strong>: Type your questions, code, or ideas.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>Persistent Memory</strong>: I remember your preferences and project details across sessions.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>Voice Ready</strong>: Press <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded text-[10px]">⌘⇧Space</code> or click the mic button to speak.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">&gt;</span>
                            <span><strong>RAG Connected</strong>: Query your local documents in real-time.</span>
                          </li>
                        </ul>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 mb-1">
                          <span className="font-mono text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            🤖 NEMI [{m.botName || activeBotObj.shortName}]
                          </span>
                          <button onClick={() => copyToClipboard(m.id, m.text)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                            {copiedId === m.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <MarkdownRenderer content={m.text} />
                      </>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 mt-2 text-[10px] text-slate-500">
                      <span>01:50 PM</span>
                      <div className="flex items-center gap-2 text-slate-400">
                        <button onClick={() => speakText(m.text)} className="hover:text-slate-200 cursor-pointer" title="Speak text">
                          <Volume2 className="w-3 h-3" />
                        </button>
                        <button className="hover:text-slate-200 cursor-pointer" title="Bookmark message">
                          <Bookmark className="w-3 h-3" />
                        </button>
                        <button onClick={() => copyToClipboard(m.id, m.text)} className="hover:text-slate-200 cursor-pointer" title="Copy text">
                          {copiedId === m.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
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
            <span>NEMI [{activeBotObj.shortName}] processing response...</span>
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
          <button
            type="button"
            className="text-slate-400 hover:text-emerald-400 cursor-pointer flex-shrink-0"
            title="Attach file or code"
          >
            <Paperclip className="w-4 h-4 text-emerald-400/80" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={activeBotObj.placeholder}
            className="flex-1 min-w-0 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => speakText(input || "NEMI active")}
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
            <span>12 memories loaded</span>
          </span>
        </div>
      </div>
    </div>
  );
}
