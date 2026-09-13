import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Loader2, Copy, Check, Sparkles, Minus, Maximize2, Minimize2, X, Terminal, MessageSquare } from 'lucide-react';
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

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ULTRON',
      botName: activeBotObj.name,
      text: `Welcome to **ULTRON NEMI**\n\nI'm your next generation AI companion & multi-agent swarm coordinator.\n- **Interactive Chat**: Ask questions, generate code, or review architectures.\n- **Persistent Memory**: System remembers your preferences across sessions.\n- **Voice Ready**: Tap 🎤 or use floating mic button to speak.`
    }
  ]);
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
    isVoiceAvailable().then(setVoiceAvailable);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const addMessage = useCallback((sender, text, botName = activeBotObj.name) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender, text, botName }]);
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

  // Quick Top Bot Pills in Chat Overlay (Matches Screenshot 1)
  const quickBots = BOTS.slice(0, 5);

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-16 right-6 z-30 px-4 py-2.5 rounded-2xl glass-panel border border-rose-500/60 bg-zinc-950/90 text-xs font-bold text-rose-200 shadow-2xl flex items-center gap-2 hover:scale-105 transition-all"
      >
        <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
        <span>NEMI Chat [{activeBotObj.shortName}]</span>
        <Maximize2 className="w-3.5 h-3.5 text-rose-400/60 ml-2" />
      </button>
    );
  }

  return (
    <div
      className={`glass-panel border border-rose-900/60 bg-zinc-950/90 backdrop-blur-2xl rounded-2xl shadow-2xl flex flex-col transition-all duration-300 pointer-events-auto ${
        isExpanded
          ? 'fixed inset-4 sm:inset-12 z-30'
          : 'fixed bottom-16 right-4 sm:right-6 w-[94vw] sm:w-[420px] h-[540px] max-h-[75vh] z-30'
      }`}
    >
      {/* Window Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-rose-900/40 bg-black/60 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
            NEMI · <span className="text-rose-400">{activeBotObj.shortName}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-rose-400/60 hover:text-rose-200 hover:bg-rose-950/40 rounded"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-rose-400/60 hover:text-rose-200 hover:bg-rose-950/40 rounded"
            title={isExpanded ? 'Restore' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick Bot Selector Tabs in Chat Window (Matches Screenshot 1) */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-black/40 border-b border-rose-900/30 overflow-x-auto no-scrollbar flex-shrink-0">
        {quickBots.map((bot) => (
          <button
            key={bot.id}
            onClick={() => setActiveAgent(bot.id)}
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium transition-all whitespace-nowrap ${
              activeAgent === bot.id
                ? 'bg-rose-600/40 text-rose-100 border border-rose-500/50'
                : 'text-rose-400/60 hover:text-rose-200 hover:bg-rose-950/30'
            }`}
          >
            {bot.shortName}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 font-sans">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-xl text-xs flex flex-col gap-1 relative ${
              m.sender === 'User'
                ? 'self-end max-w-[88%] bg-rose-600/30 text-rose-100 border border-rose-500/40'
                : 'self-start max-w-[92%] bg-black/60 text-rose-100 border border-rose-900/50 shadow-md'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-rose-900/30 pb-1 mb-0.5">
              <span className="font-bold text-[10px] text-rose-400 flex items-center gap-1">
                {m.sender === 'User' ? '👤 USER' : `🤖 NEMI [${m.botName || activeBotObj.shortName}]`}
              </span>
              <button
                onClick={() => copyToClipboard(m.id, m.text)}
                className="p-0.5 rounded text-rose-400/50 hover:text-rose-200"
                title="Copy text"
              >
                {copiedId === m.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <MarkdownRenderer content={m.text} />
          </div>
        ))}

        {partialText && (
          <div className="self-end max-w-[85%] p-2.5 rounded-xl text-xs bg-zinc-800/60 text-rose-300 border border-rose-900/30 italic">
            🎤 Listening: "{partialText}"
          </div>
        )}

        {loading && (
          <div className="self-start bg-black/80 border border-rose-900/40 p-2.5 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
            <span>NEMI [{activeBotObj.shortName}] thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar at Bottom of Floating Window */}
      <div className="p-3 bg-black/70 border-t border-rose-900/40 rounded-b-2xl flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={activeBotObj.placeholder}
          className="flex-1 bg-black/80 border border-rose-900/60 rounded-xl px-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-rose-500"
        />

        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="cyber-button p-2 rounded-xl text-rose-300 flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
