/**
 * ULTRON Desktop Native Voice Engine
 * Dedicated audio capture and speech recognition pipeline for Electron on PC.
 * Uses Windows System.Speech.Recognition via Electron IPC for 100% offline, native PC voice input.
 * Completely isolated from browser Web Speech API to protect browser Ultron.
 */

import { playWakeChime, unlockAudioContext, WAKE_WORD_REGEX, extractCommandAfterWakeWord, dedupeTranscript } from '../services/voiceService';

class DesktopVoiceEngine {
  constructor() {
    this.state = 'idle'; // 'idle' | 'listening' | 'processing'
    this.callbacks = {};
    this.manualResolve = null;
    this.isRecording = false;
    this.continuousActive = false;
    this.mediaStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.wakeWordLoopActive = false;
  }

  init(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    console.log('[DesktopVoice] Native Desktop Voice Engine initialized.');
    
    // Always notify UI that microphone permission is granted on Desktop
    if (this.callbacks.onPermissionStatus) {
      this.callbacks.onPermissionStatus(true);
    }
    if (this.callbacks.onActiveStatus) {
      this.callbacks.onActiveStatus(true);
    }

    // Start background wake word monitor if enabled
    const wakeEnabled = typeof localStorage !== 'undefined' ? localStorage.getItem('ultron_wake_word') !== 'false' : true;
    if (wakeEnabled) {
      this.startContinuousWakeListening();
    }
  }

  setState(newState) {
    this.state = newState;
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(newState);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ultron-voice-state', { detail: { state: newState } }));
    }
  }

  async activate() {
    if (this.callbacks.onPermissionStatus) this.callbacks.onPermissionStatus(true);
    if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(true);
    this.startContinuousWakeListening();
  }

  start() {
    this.startContinuousWakeListening();
  }

  stop() {
    this.stopContinuous();
  }

  isListeningContinuous() {
    return this.continuousActive;
  }

  /**
   * Start manual voice recording (e.g. ChatDrawer mic button or VoiceOverlay manual click)
   */
  async startManualRecording(onDoneCallback) {
    unlockAudioContext();
    playWakeChime();

    this.manualResolve = onDoneCallback;
    this.isRecording = true;
    this.setState('listening');
    if (this.callbacks.onPartial) this.callbacks.onPartial('Listening... Speak into your microphone');

    // Start microphone stream for UI equalizer animation
    this.startVisualEqualizer();

    // 1. Primary: Use Windows Native Speech Recognition via Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.desktopSpeechRecognize === 'function') {
      try {
        const res = await window.electronAPI.desktopSpeechRecognize({ timeout: 7 });
        this.stopVisualEqualizer();
        this.setState('processing');
        if (this.callbacks.onPartial) this.callbacks.onPartial('Processing command...');

        this.setState('idle');
        if (this.callbacks.onPartial) this.callbacks.onPartial('');
        this.isRecording = false;

        const clean = dedupeTranscript(res?.transcript || '');
        if (clean && this.callbacks && this.callbacks.onCommand) {
          try { this.callbacks.onCommand(clean); } catch (e) {}
        }
        if (this.manualResolve) {
          this.manualResolve({ transcript: clean, error: res?.error || null });
          this.manualResolve = null;
        }
        return { transcript: clean, error: null };
      } catch (err) {
        console.warn('[DesktopVoice] Native speech error:', err);
      }
    }

    // 2. Secondary Fallback: Python Backend STT
    try {
      const res = await fetch('http://127.0.0.1:8000/api/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        const clean = dedupeTranscript(data?.transcript || '');
        if (clean && this.callbacks && this.callbacks.onCommand) {
          try { this.callbacks.onCommand(clean); } catch (e) {}
        }
        this.stopVisualEqualizer();
        this.setState('idle');
        this.isRecording = false;
        if (this.manualResolve) {
          this.manualResolve({ transcript: clean, error: null });
          this.manualResolve = null;
        }
        return { transcript: clean, error: null };
      }
    } catch (e) {}

    this.stopVisualEqualizer();
    this.setState('idle');
    this.isRecording = false;
    if (this.manualResolve) {
      this.manualResolve({ transcript: '', error: 'Could not capture audio on PC' });
      this.manualResolve = null;
    }
    return { transcript: '', error: null };
  }

  /**
   * Stop ongoing manual recording
   */
  async stopManualRecording() {
    this.isRecording = false;
    this.stopVisualEqualizer();
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.desktopSpeechStop === 'function') {
      try {
        await window.electronAPI.desktopSpeechStop();
      } catch (e) {}
    }
    this.setState('idle');
    if (this.callbacks.onPartial) this.callbacks.onPartial('');
    if (this.manualResolve) {
      this.manualResolve({ transcript: '', error: null });
      this.manualResolve = null;
    }
  }

  /**
   * Background Continuous Wake-Word Detection on PC
   */
  async startContinuousWakeListening() {
    if (this.continuousActive) return;
    this.continuousActive = true;
    console.log('[DesktopVoice] Continuous wake word monitoring active on PC.');

    if (this.callbacks.onPermissionStatus) this.callbacks.onPermissionStatus(true);
    if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(true);

    const runWakeLoop = async () => {
      while (this.continuousActive) {
        // Skip while user is manually talking or system is speaking
        const isSpeaking = typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking;
        if (this.isRecording || isSpeaking) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }

        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.desktopSpeechRecognize === 'function') {
          try {
            const res = await window.electronAPI.desktopSpeechRecognize({ timeout: 5 });
            const text = (res && res.transcript) ? res.transcript.trim() : '';

            if (text && WAKE_WORD_REGEX.test(text)) {
              playWakeChime();
              const cmd = extractCommandAfterWakeWord(text);
              if (this.callbacks.onWake) {
                this.callbacks.onWake({ raw: text, command: cmd });
              }
              if (this.callbacks.onCommand && cmd) {
                this.callbacks.onCommand(cmd);
              }
            }
          } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
          }
        } else {
          break;
        }
        await new Promise(r => setTimeout(r, 300));
      }
    };

    runWakeLoop().catch(() => {});
  }

  stopContinuous() {
    this.continuousActive = false;
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.desktopSpeechStop === 'function') {
      try { window.electronAPI.desktopSpeechStop(); } catch (e) {}
    }
    if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(false);
  }

  /**
   * Audio Analyser for UI animated equalizers
   */
  async startVisualEqualizer() {
    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      }
      if (!this.mediaStream) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    } catch (e) {}
  }

  stopVisualEqualizer() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }
}

export const desktopVoiceEngine = new DesktopVoiceEngine();
