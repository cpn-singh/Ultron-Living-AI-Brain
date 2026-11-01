import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, AlertCircle, Sparkles, Volume2, VolumeX, Radio } from 'lucide-react';
import { 
  ultronVoiceEngine,
  requestMicrophonePermission,
  playWakeChime
} from '../services/voiceService';
import { stopSpeech, isUltronSpeaking } from '../services/voiceTtsService';

export default function VoiceOverlay({ activeTab, onSpeechResult }) {
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'processing'
  const [partialText, setPartialText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasMicPermission, setHasMicPermission] = useState(true);
  const [isEngineActive, setIsEngineActive] = useState(false);
  const [equalizerHeights, setEqualizerHeights] = useState([8, 14, 6, 20, 10, 18, 7, 16, 14, 11, 9, 15]);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => localStorage.getItem('ultron_wake_word') !== 'false');
  const [wakeTriggered, setWakeTriggered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isListening = voiceState === 'listening';
  const isProcessing = voiceState === 'processing';

  // Listen to Ultron speech synthesis events
  useEffect(() => {
    const handleStart = () => setIsSpeaking(true);
    const handleEnd = () => setIsSpeaking(false);
    window.addEventListener('ultron-speaking-start', handleStart);
    window.addEventListener('ultron-speaking-end', handleEnd);
    return () => {
      window.removeEventListener('ultron-speaking-start', handleStart);
      window.removeEventListener('ultron-speaking-end', handleEnd);
    };
  }, []);

  // Animate audio equalizer bars when listening or Ultron speaking
  useEffect(() => {
    let interval;
    if (isListening || isSpeaking) {
      interval = setInterval(() => {
        setEqualizerHeights(
          Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 4)
        );
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isListening, isSpeaking]);

  // Initialize unified continuous voice engine
  useEffect(() => {
    ultronVoiceEngine.init({
      onStateChange: (newState) => {
        setVoiceState(newState);
      },
      onPartial: (text) => {
        setPartialText(text);
      },
      onWake: ({ raw, command }) => {
        setWakeTriggered(true);
        setTimeout(() => setWakeTriggered(false), 3200);
      },
      onCommand: (command) => {
        if (command && command.trim()) {
          if (onSpeechResult) onSpeechResult(command.trim());
        }
      },
      onPermissionStatus: (granted) => {
        setHasMicPermission(granted);
      },
      onActiveStatus: (active) => {
        setIsEngineActive(active);
      }
    });

    // Start continuous listener immediately on mount
    if (wakeWordEnabled) {
      ultronVoiceEngine.activate().catch(() => {});
    }

    // Auto-prime listener on user interaction
    const handleDocumentInteraction = () => {
      if (wakeWordEnabled && !ultronVoiceEngine.isListeningContinuous()) {
        ultronVoiceEngine.activate().catch(() => {});
      }
    };
    window.addEventListener('click', handleDocumentInteraction, { passive: true });
    window.addEventListener('keydown', handleDocumentInteraction, { passive: true });

    // Listen for Settings toggle & language change events
    const handleToggleEvent = (e) => {
      const enabled = e.detail?.enabled ?? true;
      setWakeWordEnabled(enabled);
      if (enabled) {
        ultronVoiceEngine.activate();
      } else {
        ultronVoiceEngine.stop();
      }
    };
    const handleLangChangeEvent = () => {
      if (wakeWordEnabled) {
        ultronVoiceEngine.stop();
        setTimeout(() => ultronVoiceEngine.start().catch(() => {}), 200);
      }
    };
    window.addEventListener('ultron-wake-word-toggle', handleToggleEvent);
    window.addEventListener('ultron-speech-lang-change', handleLangChangeEvent);

    return () => {
      window.removeEventListener('click', handleDocumentInteraction);
      window.removeEventListener('keydown', handleDocumentInteraction);
      window.removeEventListener('ultron-wake-word-toggle', handleToggleEvent);
      window.removeEventListener('ultron-speech-lang-change', handleLangChangeEvent);
      ultronVoiceEngine.stop();
    };
  }, [onSpeechResult, wakeWordEnabled]);

  // Keyboard shortcut listener for Cmd+Shift+Space / Ctrl+Shift+Space
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voiceState]);

  // Explicitly activate continuous wake word listener
  const handleActivateWakeWord = async (e) => {
    if (e) e.stopPropagation();
    try {
      await ultronVoiceEngine.activate();
      setIsEngineActive(true);
      setHasMicPermission(true);
    } catch (err) {
      setErrorMsg('Could not start microphone listener. Check browser permissions.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Toggle listening or stop speech from UI button
  const toggleListening = async () => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    if (voiceState === 'listening') {
      ultronVoiceEngine.submitCurrentCommand();
    } else {
      await ultronVoiceEngine.triggerManual();
      setIsEngineActive(true);
    }
  };

  const handleCancelListening = (e) => {
    e.stopPropagation();
    ultronVoiceEngine.cancelManual();
  };

  return (
    <div className={`fixed bottom-24 sm:bottom-24 right-4 sm:right-6 flex-col items-end gap-3 z-40 pointer-events-auto select-none touch-manipulation ${
      activeTab === 'chat' ? 'hidden sm:flex' : 'flex'
    }`}>
      {/* Error Toast */}
      {errorMsg && (
        <div className="p-3 bg-red-950/90 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2 shadow-xl animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mic Permission Warning Banner if denied */}
      {!hasMicPermission && (
        <button
          type="button"
          onClick={handleActivateWakeWord}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer animate-pulse transition-all active:scale-95 border border-amber-300"
          title="Click to allow microphone access"
        >
          <Mic className="w-4 h-4 text-slate-950" />
          <span>Allow Mic for "Hey Ultron"</span>
        </button>
      )}

      {/* Listening Floating Overlay Visualizer Card */}
      {(isListening || isProcessing) && (
        <div className="glass-panel px-4 py-3 max-w-sm bg-slate-950/95 border border-cyan-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_24px_rgba(6,182,212,0.25)] backdrop-blur-xl rounded-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-bounce' : 'bg-cyan-400 animate-ping'}`} />
              <span className={`text-xs font-medium ${isProcessing ? 'text-amber-300' : 'text-cyan-300'}`}>
                {isProcessing ? 'Processing...' : 'Listening'}
              </span>
            </div>

            {/* Live Audio Equalizer Frequency Bars */}
            <div className="flex items-center gap-[3px] h-6 ml-1">
              {equalizerHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-gradient-to-t from-cyan-400 to-teal-200 transition-all duration-100"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleCancelListening}
              aria-label="Cancel voice command"
              className="ml-auto text-white/40 hover:text-white/80 transition-colors p-1 rounded-md focus-visible:ring-2 focus-visible:ring-cyan-400/50 cursor-pointer"
              title="Cancel command"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Transcript / Speech Indicator */}
          <p className="text-sm text-white/95 font-normal leading-relaxed">
            {partialText ? partialText : 'Listening, speak now...'}
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-cyan-400 animate-pulse align-text-bottom" />
          </p>
        </div>
      )}

      {/* Floating Mic FAB Button with Standby Wake Word Badge & Pulsing Ring */}
      <div className="relative flex flex-col items-end sm:items-center gap-2">
        {/* Continuous Wake Word Active / Trigger Badge */}
        <button
          type="button"
          onClick={isSpeaking ? stopSpeech : handleActivateWakeWord}
          className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all flex items-center gap-2 cursor-pointer border ${
            wakeTriggered
              ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/70 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
              : isSpeaking
              ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.6)] animate-pulse'
              : isEngineActive
              ? 'bg-slate-950/90 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:border-cyan-400'
              : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse hover:bg-emerald-900/60'
          }`}
          title={isSpeaking ? 'Ultron speaking. Click to silence' : isEngineActive ? 'Continuous listening active! Say "Hey Ultron" anytime' : 'Click to activate continuous "Hey Ultron" voice listening'}
        >
          <span className={`w-2 h-2 rounded-full ${
            wakeTriggered 
              ? 'bg-emerald-300 animate-ping' 
              : isSpeaking
              ? 'bg-cyan-300 animate-ping'
              : isListening
              ? 'bg-cyan-400 animate-ping'
              : isEngineActive 
              ? 'bg-cyan-400 animate-pulse' 
              : 'bg-emerald-400 animate-bounce'
          }`} />
          <span>
            {wakeTriggered 
              ? 'Heard "Hey Ultron"' 
              : isSpeaking
              ? 'Ultron speaking...'
              : isListening
              ? 'Listening...'
              : isEngineActive 
              ? 'Say "Hey Ultron"' 
              : 'Voice standby'}
          </span>
        </button>

        <div className="relative flex items-center justify-center">
          {(isListening || isProcessing || isSpeaking) && (
            <>
              <div
                className="absolute inset-0 rounded-full border border-green-400 animate-ping opacity-60 pointer-events-none"
                style={{ transform: 'scale(1.25)' }}
              />
              <div
                className="absolute inset-0 rounded-full border border-lime-400 animate-pulse opacity-40 pointer-events-none"
                style={{ transform: 'scale(1.40)' }}
              />
            </>
          )}

          <button
            type="button"
            onClick={toggleListening}
            aria-label={isSpeaking ? 'Silence Ultron voice' : isListening ? 'Stop voice listening' : 'Start voice listening'}
            title={isSpeaking ? 'Silence Ultron voice (Click or Space)' : isListening ? 'Stop listening (⌘⇧Space)' : 'Start voice input (or say "Hey Ultron")'}
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-lime-400 via-emerald-400 to-green-300 shadow-[0_0_30px_rgba(34,197,94,0.75),0_0_70px_rgba(16,185,129,0.35)] flex items-center justify-center cursor-pointer select-none transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
              isListening || isSpeaking ? 'scale-110 animate-pulse' : 'hover:scale-105'
            }`}
          >
            <div>
              {isSpeaking ? (
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 font-bold animate-bounce" />
              ) : isListening ? (
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 font-bold" />
              ) : (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 font-bold" />
              )}
            </div>
          </button>
        </div>

        {/* Keyboard shortcut indicator */}
        <div className="text-[10px] text-white/30 text-center hidden sm:block font-sans">
          Press Space or say "Hey Ultron"
        </div>
      </div>
    </div>
  );
}
