import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, AlertCircle } from 'lucide-react';
import { startVoiceRecognition, stopVoiceRecognition } from '../services/voiceService';

export default function VoiceOverlay({ activeTab, onSpeechResult }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [equalizerHeights, setEqualizerHeights] = useState([8, 12, 6, 20, 10, 15, 7, 16, 14, 11, 9, 13]);

  // Animate audio equalizer bars when listening
  useEffect(() => {
    let interval;
    if (isListening && !isProcessing) {
      interval = setInterval(() => {
        setEqualizerHeights(
          Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 4)
        );
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isListening, isProcessing]);

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
  }, [isListening]);

  const toggleListening = async () => {
    if (isListening || isProcessing) {
      await stopVoiceRecognition();
      setIsListening(false);
      setIsProcessing(false);
      setPartialText('');
      setErrorMsg('');
      return;
    }

    setErrorMsg('');
    setIsListening(true);
    setIsProcessing(false);
    setPartialText('');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (e) {
      console.warn('[Microphone] Audio permission warning:', e);
    }

    const { transcript, error } = await startVoiceRecognition({
      onStatus: (status) => {
        if (status === 'listening') {
          setIsListening(true);
          setIsProcessing(false);
          setErrorMsg('');
        }
        if (status === 'processing') {
          setIsListening(true);
          setIsProcessing(true);
        }
        if (status === 'idle') {
          setIsListening(false);
          setIsProcessing(false);
        }
      },
      onPartial: (partial) => {
        setPartialText(partial);
      },
    });

    setIsListening(false);
    setIsProcessing(false);
    setPartialText('');

    if (transcript && transcript.trim()) {
      if (onSpeechResult) onSpeechResult(transcript);
    } else if (error) {
      if (error !== 'no-speech' && error !== 'aborted') {
        setErrorMsg(error === 'not-allowed' ? 'Microphone permission denied' : error);
        setTimeout(() => setErrorMsg(''), 4000);
      }
    }
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

      {/* Listening Floating Overlay Visualizer Card */}
      {isListening && (
        <div className="glass-panel px-4 py-3 max-w-sm bg-slate-950/95 border border-cyan-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_24px_rgba(6,182,212,0.25)] backdrop-blur-xl rounded-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isProcessing ? 'bg-amber-400 animate-bounce' : 'bg-cyan-400 animate-ping'}`} />
              <span className={`text-xs font-semibold tracking-widest uppercase ${isProcessing ? 'text-amber-300' : 'text-lime-300'}`}>
                {isProcessing ? 'Transcribing...' : 'Listening'}
              </span>
            </div>

            {/* Live Audio Equalizer Frequency Bars */}
            <div className="flex items-center gap-[3px] h-6 ml-1">
              {equalizerHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-gradient-to-t from-green-400 to-lime-200 transition-all duration-100"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={toggleListening}
              aria-label="Stop audio or voice listening"
              className="ml-auto text-white/40 hover:text-white/80 transition-colors p-1 rounded-md focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Transcript / Speech Indicator */}
          <p className="text-sm text-white/90 font-light leading-relaxed">
            {partialText ? `"${partialText}"` : 'Listening... speak now'}
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-green-400 animate-pulse align-text-bottom" />
          </p>
        </div>
      )}

      {/* Floating Mic FAB Button with Pulsing Ring Animations & Shortcut Badge */}
      <div className="relative flex flex-col items-center gap-1.5">
        <div className="relative flex items-center justify-center">
          {isListening && (
            <>
              <div
                className="absolute inset-0 rounded-full border border-green-400 animate-ping opacity-60"
                style={{ transform: 'scale(1.25)' }}
              />
              <div
                className="absolute inset-0 rounded-full border border-lime-400 animate-pulse opacity-40"
                style={{ transform: 'scale(1.40)' }}
              />
            </>
          )}

          <button
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? 'Stop voice listening' : 'Start voice listening'}
            title={isListening ? 'Stop listening (⌘⇧Space)' : 'Start voice input (⌘⇧Space)'}
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-lime-400 via-emerald-400 to-green-300 shadow-[0_0_30px_rgba(34,197,94,0.75),0_0_70px_rgba(16,185,129,0.35)] flex items-center justify-center cursor-pointer select-none transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
              isListening ? 'scale-110 animate-pulse' : 'hover:scale-105'
            }`}
          >
            <div>
              {isListening ? (
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 font-bold" />
              ) : (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 font-bold" />
              )}
            </div>
          </button>
        </div>

        {/* Keyboard shortcut indicator */}
        <div className="text-[10px] text-white/30 text-center tabular-nums hidden sm:block font-mono">
          ⌘⇧Space
        </div>
      </div>
    </div>
  );
}
