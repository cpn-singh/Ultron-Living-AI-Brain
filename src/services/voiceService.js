import { registerPlugin, Capacitor } from '@capacitor/core';

import { safeFetchPost } from './safeFetchService';

// Register native plugin for Capacitor mobile
const UltronVoice = registerPlugin('UltronVoice', {
  web: async () => ({
    isAvailable: async () => ({ available: false }),
    startListening: async () => ({ transcript: '', error: 'Web fallback' }),
    stopListening: async () => ({}),
  }),
});

let webRecognition = null;
let mediaRecorder = null;
let audioChunks = [];
let silenceTimer = null;
let statusListener = null;
let partialListener = null;

const PYTHON_BACKEND_URL = 'http://127.0.0.1:8000';

/**
 * Detect if running inside an Android browser (not native Capacitor app).
 */
function isAndroidBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /android/i.test(ua) && !Capacitor.isNativePlatform();
}

/**
 * Returns true if the Web Speech API is available in the current browser.
 * Modern Android Chrome (v33+) supports webkitSpeechRecognition natively
 * without requiring a local backend.
 */
function isWebSpeechAvailable() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Check if voice recognition is available.
 */
export async function isVoiceAvailable() {
  if (typeof window !== 'undefined') {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) return true;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) return true;
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const { available } = await UltronVoice.isAvailable();
      return !!available;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Request audio microphone permissions from the browser
 */
export async function requestMicrophonePermission() {
  if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Keep tracks active briefly then stop
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.warn('[VoiceService] Microphone permission request failed:', err);
      return false;
    }
  }
  return true;
}

/**
 * Encodes Float32 Array of PCM audio samples into 16kHz 16-bit Mono WAV Blob
 */
function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM 1) */
  view.setUint16(20, 1, true);
  /* channel count (1 = mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate */
  view.setUint32(28, sampleRate * 2, true);
  /* block align */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Fallback MediaRecorder audio recording for Electron / browsers without Web Speech API key
 */
async function startMediaRecorderFallback(onStatus, onPartial) {
  return new Promise(async (resolve) => {
    let audioCtx = null;
    let silenceStart = null;
    let speechDetected = false;
    let volumeAnimationId = null;
    let pcmBuffers = [];
    let scriptProcessor = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      audioChunks = [];
      pcmBuffers = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorder = recorder;

      if (onStatus) onStatus('listening');
      if (onPartial) onPartial('Listening...');

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      // Set up AudioContext volume detection & raw PCM recording for Python STT
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass({ sampleRate: 16000 });
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);

          scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              const inputData = e.inputBuffer.getChannelData(0);
              pcmBuffers.push(new Float32Array(inputData));
            }
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(audioCtx.destination);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const checkVolume = () => {
            if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const avg = sum / bufferLength;

            if (avg > 6) {
              speechDetected = true;
              silenceStart = null;
              if (onPartial) onPartial('Listening...');
            } else if (speechDetected) {
              if (!silenceStart) silenceStart = Date.now();
              else if (Date.now() - silenceStart > 2500) {
                // Silence for 2.5s after speech -> auto-stop
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                  try { mediaRecorder.stop(); } catch (e) {}
                }
                return;
              }
            }
            volumeAnimationId = requestAnimationFrame(checkVolume);
          };
          volumeAnimationId = requestAnimationFrame(checkVolume);
        }
      } catch (e) {
        console.warn('[VoiceService] AudioContext setup error:', e);
      }

      // Max safety timer: stop after 12 seconds if no auto silence triggered
      silenceTimer = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          try { mediaRecorder.stop(); } catch (e) {}
        }
      }, 12000);

      recorder.onstop = async () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        if (volumeAnimationId) cancelAnimationFrame(volumeAnimationId);
        
        let wavBlob = null;
        if (pcmBuffers.length > 0) {
          let totalLength = 0;
          for (let b of pcmBuffers) totalLength += b.length;
          const mergedPCM = new Float32Array(totalLength);
          let offset = 0;
          for (let b of pcmBuffers) {
            mergedPCM.set(b, offset);
            offset += b.length;
          }
          wavBlob = encodeWAV(mergedPCM, (audioCtx && audioCtx.sampleRate) || 16000);
        }

        if (scriptProcessor) {
          try { scriptProcessor.disconnect(); } catch (e) {}
        }
        if (audioCtx) {
          try { audioCtx.close(); } catch (e) {}
          audioCtx = null;
        }

        stream.getTracks().forEach(track => track.stop());
        if (onStatus) onStatus('processing');

        const finalBlob = wavBlob || new Blob(audioChunks, { type: 'audio/webm' });

        try {
          const reader = new FileReader();
          reader.readAsDataURL(finalBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result;
            try {
              const res = await safeFetchPost(`${PYTHON_BACKEND_URL}/api/stt`, { audio: base64Audio });
              if (res.ok) {
                const data = await res.json();
                if (onStatus) onStatus('idle');
                resolve({ transcript: data.transcript || '', error: null });
                return;
              }
            } catch (e) {
              // Python backend unreachable (e.g. on Android mobile browser)
            }
            if (onStatus) onStatus('idle');
            // On Android/mobile, local backend is not reachable — show a clear error
            if (isAndroidBrowser()) {
              resolve({ transcript: '', error: 'Voice-to-text backend is not reachable on this device. Please type your message instead.' });
            } else {
              resolve({ transcript: '', error: 'Speech-to-text service is unavailable. Please type your message.' });
            }
          };
        } catch (err) {
          if (onStatus) onStatus('idle');
          resolve({ transcript: '', error: 'Could not process audio.' });
        }
      };

      recorder.start(250);
    } catch (err) {
      if (onStatus) onStatus('idle');
      resolve({ transcript: '', error: 'Microphone permission denied or unavailable' });
    }
  });
}

/**
 * Start voice recognition (Web Speech API -> MediaRecorder fallback -> Mobile Plugin)
 */
export async function startVoiceRecognition({ onStatus, onPartial } = {}) {
  // Ensure microphone permission is requested first
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    return { transcript: '', error: 'Microphone permission denied. Please allow microphone access in your browser.' };
  }

  // 1. Try Web Speech API (Works in Chrome/Edge desktop and modern Android Chrome)
  // Modern Android Chrome supports webkitSpeechRecognition natively without needing
  // a local backend. We use it on all platforms (desktop + Android browser).
  if (isWebSpeechAvailable()) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    return new Promise((resolve) => {
      try {
        if (webRecognition) {
          try { webRecognition.abort(); } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        webRecognition = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = getSpeechLanguage();

        let accumulatedTranscript = '';
        let lastSpeechTime = Date.now();
        let autoStopTimeout = null;

        recognition.onstart = () => {
          if (onStatus) onStatus('listening');
          if (onPartial) onPartial('Listening...');

          silenceTimer = setInterval(() => {
            if (Date.now() - lastSpeechTime > 8000) {
              try { recognition.stop(); } catch (e) {}
            }
          }, 1000);
        };

        recognition.onresult = (event) => {
          lastSpeechTime = Date.now();
          let interim = '';
          let hasFinal = false;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              accumulatedTranscript += ' ' + res[0].transcript;
              hasFinal = true;
            } else {
              interim += res[0].transcript;
            }
          }

          const currentPartial = (accumulatedTranscript + ' ' + interim).trim();
          if (onPartial && currentPartial) {
            onPartial(currentPartial);
          }

          if (autoStopTimeout) clearTimeout(autoStopTimeout);

          // Give user 2.2s after final phrase or 3.0s after interim phrase to complete their sentence
          if (currentPartial.length > 0) {
            autoStopTimeout = setTimeout(() => {
              try { recognition.stop(); } catch (e) {}
            }, hasFinal ? 2200 : 3000);
          }
        };

        recognition.onerror = async (event) => {
          console.warn('[VoiceService] SpeechRecognition error:', event.error);
          if (silenceTimer) clearInterval(silenceTimer);
          if (autoStopTimeout) clearTimeout(autoStopTimeout);

          // On desktop, fall back to MediaRecorder + Python backend on recognition failure
          if (!isAndroidBrowser() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && event.error !== 'aborted') {
            try {
              const fallbackRes = await startMediaRecorderFallback(onStatus, onPartial);
              resolve(fallbackRes);
              return;
            } catch (e) {
              console.warn('[VoiceService] Fallback also failed:', e);
            }
          }

          if (onStatus) onStatus('idle');
          resolve({ 
            transcript: accumulatedTranscript.trim(), 
            error: event.error === 'no-speech' ? null : (event.error === 'not-allowed' ? 'Microphone permission denied' : event.error) 
          });
        };

        recognition.onend = () => {
          if (silenceTimer) clearInterval(silenceTimer);
          if (autoStopTimeout) clearTimeout(autoStopTimeout);
          if (onStatus) onStatus('processing');
          
          const resultText = accumulatedTranscript.trim();
          setTimeout(() => {
            if (onStatus) onStatus('idle');
          }, 200);

          if (resultText) {
            resolve({ transcript: resultText, error: null });
          } else if (!isAndroidBrowser() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Desktop only: fall back to MediaRecorder + local Python STT
            startMediaRecorderFallback(onStatus, onPartial).then(resolve);
          } else {
            resolve({ transcript: '', error: null });
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('[VoiceService] Failed to start Web Speech API, using MediaRecorder fallback:', err);
        if (!isAndroidBrowser() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          startMediaRecorderFallback(onStatus, onPartial).then(resolve);
        } else {
          resolve({ transcript: '', error: err.message || 'Could not start Web Speech Recognition' });
        }
      }
    });
  }

  // 2. Desktop browser without Web Speech API — use MediaRecorder + local Python STT backend
  if (!isAndroidBrowser() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return startMediaRecorderFallback(onStatus, onPartial);
  }

  // 3. Android browser without Web Speech API support — show a clear message
  if (isAndroidBrowser()) {
    return { transcript: '', error: 'Voice input requires Chrome on Android. Please update Chrome or type your message.' };
  }
  if (Capacitor.isNativePlatform()) {
    if (statusListener) { await statusListener.remove(); statusListener = null; }
    if (partialListener) { await partialListener.remove(); partialListener = null; }

    if (onStatus) {
      statusListener = await UltronVoice.addListener('speechStatus', (ev) => {
        onStatus(ev.status);
      });
    }
    if (onPartial) {
      partialListener = await UltronVoice.addListener('speechPartial', (ev) => {
        onPartial(ev.partial);
      });
    }

    try {
      const result = await UltronVoice.startListening();
      return result;
    } catch (err) {
      return { transcript: '', error: err.message || 'Voice recognition failed' };
    } finally {
      if (statusListener) { await statusListener.remove(); statusListener = null; }
      if (partialListener) { await partialListener.remove(); partialListener = null; }
    }
  }

  return { transcript: '', error: 'Speech Recognition is not supported on this browser' };
}

/**
 * Manually stop an in-progress recognition session.
 */
export async function stopVoiceRecognition() {
  if (silenceTimer) {
    clearInterval(silenceTimer);
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch (e) {}
    mediaRecorder = null;
  }
  if (webRecognition) {
    try { webRecognition.stop(); } catch (e) {}
    webRecognition = null;
  }
  if (Capacitor.isNativePlatform()) {
    try { await UltronVoice.stopListening(); } catch {}
  }
}


/**
 * Synthesizes a futuristic two-tone confirmation chime using Web Audio API
 */
let sharedAudioCtx = null;
function getAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

export function playWakeChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.18, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.28);
  } catch (e) {
    // Non-blocking audio fallback
  }
}

/**
 * Get configured speech recognition language (default: 'en-IN' for Indian English & Hinglish)
 */
export function getSpeechLanguage() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('ultron_speech_lang') || 'en-IN';
  }
  return 'en-IN';
}

export function setSpeechLanguage(langCode) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('ultron_speech_lang', langCode);
    window.dispatchEvent(new CustomEvent('ultron-speech-lang-change', { detail: { lang: langCode } }));
  }
}

/**
 * Broad multilingual phonetic regex supporting:
 * - Indian English & accents: "hey ultron", "ultron", "ultra", "altron", "aaltron", "eltron", "oltron", "voltron", "waltron", "electron", "all tron", "old tron", "haltron"
 * - Hinglish prefixes: "arre ultron", "arey ultron", "suno ultron", "sun ultron", "bhai ultron", "oye ultron", "namaste ultron"
 * - Hindi (Devanagari): "हे अल्ट्रॉन", "अरे अल्ट्रॉन", "सुनो अल्ट्रॉन", "अल्ट्रॉन", "अल्ट्रा", "अलट्रान", "अलट्रोन", "नमस्ते अल्ट्रॉन"
 * - Tolerant to punctuation (commas, periods, quotes) produced by Chrome speech models
 */
export const WAKE_WORD_REGEX = new RegExp(
  '(?:' +
    '\\b(?:hey|hi|hello|ok|okay|listen|arre|arey|are|suno|sun|bhai|oye|o|namaste|yo)?' +
    '[\\s,.\'\\"-]*' +
    '(?:ultron|altron|aaltron|ultra|eltron|oltron|voltron|waltron|electron|all\\s*tron|old\\s*tron|haltron|ultran|altran|outrun|el\\s*drone|all\\s*drone|old\\s*drone)\\b' +
  ')|' +
  '(?:' +
    '(?:हे|अरे|सुनो|सुन|भाई|ओ|नमस्ते)?' +
    '[\\s,.\'\\"-]*' +
    '(?:अल्ट्रॉन|अल्ट्रोन|अल्ट्रा|अलट्रान|अलट्रॉन|ओल्ट्रॉन|एलट्रॉन|इलेक्ट्रॉन)' +
  ')',
  'i'
);

/**
 * Extracts voice command following the wake word (in English, Indian English, Hinglish, or Hindi).
 * e.g. "Hey Ultron what is the time" -> "what is the time"
 * e.g. "Suno Ultron aaj ka weather kaisa hai" -> "aaj ka weather kaisa hai"
 * e.g. "अरे अल्ट्रॉन भारत की राजधानी क्या है" -> "भारत की राजधानी क्या है"
 */
export function extractCommandAfterWakeWord(text) {
  if (!text) return '';
  return text
    .replace(
      new RegExp(
        '^.*?(?:' +
          '\\b(?:hey|hi|hello|ok|okay|listen|arre|arey|are|suno|sun|bhai|oye|o|namaste|yo)?' +
          '[\\s,.\'\\"-]*' +
          '(?:ultron|altron|aaltron|ultra|eltron|oltron|voltron|waltron|electron|all\\s*tron|old\\s*tron|haltron|ultran|altran|outrun|el\\s*drone|all\\s*drone|old\\s*drone)\\b' +
        '|' +
          '(?:हे|अरे|सुनो|सुन|भाई|ओ|नमस्ते)?' +
          '[\\s,.\'\\"-]*' +
          '(?:अल्ट्रॉन|अल्ट्रोन|अल्ट्रा|अलट्रान|अलट्रॉन|ओल्ट्रॉन|एलट्रॉन|इलेक्ट्रॉन)' +
        ')[\\s,.:;!\\-\\?\'"]*',
        'i'
      ),
      ''
    )
    .trim();
}

/**
 * UNIFIED ULTRON SPEECH & WAKE WORD ENGINE
 * Runs continuous background listening for "Hey Ultron" / "Ultron",
 * plays the wake chime, captures the voice command, and submits it to AI.
 */
class UltronContinuousVoiceEngine {
  constructor() {
    this.recognition = null;
    this.mediaStream = null;
    this.state = 'idle'; // 'idle' | 'listening' | 'processing'
    this.isEnabled = true;
    this.isActive = false;
    this.callbacks = {};
    this.silenceTimer = null;
    this.hardSafetyTimer = null;
    this.restartTimer = null;
    this.selfSpeakingTimeout = null;
    this.currentCommandText = '';
    this.isStarting = false;
    this.lastProcessedIndex = -1;
    this.highestResultIndex = -1;
    this.isSelfSpeaking = false;
  }

  pauseSelfListening(maxDurationMs = 8000) {
    this.isSelfSpeaking = true;
    if (this.selfSpeakingTimeout) clearTimeout(this.selfSpeakingTimeout);
    this.selfSpeakingTimeout = setTimeout(() => {
      this.resumeSelfListening();
    }, maxDurationMs);
  }

  resumeSelfListening() {
    if (this.selfSpeakingTimeout) {
      clearTimeout(this.selfSpeakingTimeout);
      this.selfSpeakingTimeout = null;
    }
    setTimeout(() => {
      this.lastProcessedIndex = Math.max(this.lastProcessedIndex, this.highestResultIndex);
      this.isSelfSpeaking = false;
    }, 300);
  }

  init(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.isEnabled = localStorage.getItem('ultron_wake_word') !== 'false';
    if (this.isEnabled) {
      this.start();
    }
  }

  isListeningContinuous() {
    return this.isActive && !!this.recognition;
  }

  async activate() {
    this.isEnabled = true;
    this.isActive = true;
    localStorage.setItem('ultron_wake_word', 'true');
    playWakeChime();
    this.start();
  }

  async start() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[UltronVoice] Web Speech API not supported in this browser.');
      return;
    }

    if (this.recognition || this.isStarting) return;
    this.isStarting = true;

    try {
      const recognition = new SpeechRecognition();
      this.recognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = getSpeechLanguage();

      recognition.onstart = () => {
        this.isStarting = false;
        this.isActive = true;
        this.lastProcessedIndex = -1;
        this.highestResultIndex = -1;
        if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(true);
        if (this.callbacks.onPermissionStatus) this.callbacks.onPermissionStatus(true);
        console.log('[UltronVoice] Continuous "Hey Ultron" listener active & listening.');
      };

      recognition.onresult = (event) => {
        // Clear self-speaking flag if browser is not actively talking
        if (typeof window !== 'undefined' && (!window.speechSynthesis || !window.speechSynthesis.speaking)) {
          this.isSelfSpeaking = false;
        }
        if (this.isSelfSpeaking) return;

        let interim = '';
        let final = '';

        for (let i = 0; i < event.results.length; i++) {
          this.highestResultIndex = Math.max(this.highestResultIndex, i);
          // Skip already processed historical utterances
          if (i <= this.lastProcessedIndex) continue;

          const res = event.results[i];
          if (res.isFinal) {
            final += ' ' + res[0].transcript;
          } else {
            interim += ' ' + res[0].transcript;
          }
        }

        const rawSpoken = (final + ' ' + interim).trim();
        if (!rawSpoken) return;

        const normalizedSpoken = rawSpoken.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/gu, ' ').replace(/\s+/g, ' ').trim();

        // STATE 1: IDLE (Wake Word Detection Mode)
        if (this.state === 'idle') {
          if (WAKE_WORD_REGEX.test(rawSpoken) || WAKE_WORD_REGEX.test(normalizedSpoken)) {
            playWakeChime();

            const followingCommand = extractCommandAfterWakeWord(rawSpoken);
            this.state = 'listening';
            this.currentCommandText = followingCommand;

            if (this.callbacks.onWake) {
              this.callbacks.onWake({ raw: rawSpoken, command: followingCommand });
            }
            if (this.callbacks.onStateChange) {
              this.callbacks.onStateChange('listening');
            }

            if (followingCommand && followingCommand.length > 1) {
              if (this.callbacks.onPartial) {
                this.callbacks.onPartial(followingCommand);
              }
              this.scheduleSilenceSubmit(1800);
            } else {
              if (this.callbacks.onPartial) {
                this.callbacks.onPartial('Listening, go ahead...');
              }
              this.scheduleSilenceSubmit(3500);
            }

            // Hard safety timer: close listening HUD after 7 seconds max
            this.scheduleHardTimeout(7000);
          }
        }
        // STATE 2: LISTENING (Voice Command Capture Mode)
        else if (this.state === 'listening') {
          const cleanCommand = extractCommandAfterWakeWord(rawSpoken) || rawSpoken;
          this.currentCommandText = cleanCommand;

          if (this.callbacks.onPartial) {
            this.callbacks.onPartial(cleanCommand);
          }

          // If speech reached a final phrase, finish shortly
          if (final.trim().length > 0) {
            this.scheduleSilenceSubmit(1200);
          } else {
            this.scheduleSilenceSubmit(1800);
          }
        }
      };

      recognition.onerror = (event) => {
        this.isStarting = false;
        if (event.error === 'not-allowed') {
          console.warn('[UltronVoice] Microphone permission not allowed');
          if (this.callbacks.onPermissionStatus) this.callbacks.onPermissionStatus(false);
          this.isActive = false;
          return;
        }

        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[UltronVoice] Recognition status/error:', event.error);
        }
      };

      recognition.onend = () => {
        this.isStarting = false;
        this.recognition = null;
        this.lastProcessedIndex = -1;
        this.highestResultIndex = -1;

        // Auto-restart if user has enabled wake word and engine is active
        // Web Speech API continuous naturally ends on extended silence (~60s); restarting here keeps it 24/7 active
        if (this.isEnabled && this.isActive) {
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (this.isEnabled && this.isActive) {
              this.start();
            }
          }, 200);
        } else {
          if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(false);
        }
      };

      recognition.start();
    } catch (err) {
      this.isStarting = false;
      this.recognition = null;
      console.warn('[UltronVoice] Start exception (will retry):', err);
      if (this.isEnabled && this.isActive) {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => this.start(), 500);
      }
    }
  }

  scheduleSilenceSubmit(timeoutMs = 1800) {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.submitCurrentCommand();
    }, timeoutMs);
  }

  scheduleHardTimeout(timeoutMs = 7000) {
    if (this.hardSafetyTimer) clearTimeout(this.hardSafetyTimer);
    this.hardSafetyTimer = setTimeout(() => {
      if (this.state === 'listening') {
        this.submitCurrentCommand();
      }
    }, timeoutMs);
  }

  submitCurrentCommand() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.hardSafetyTimer) {
      clearTimeout(this.hardSafetyTimer);
      this.hardSafetyTimer = null;
    }

    const command = (this.currentCommandText || '').trim();
    const hasValidCommand = command && command.length > 1 && !WAKE_WORD_REGEX.test(command);

    if (hasValidCommand) {
      this.state = 'processing';
      if (this.callbacks.onStateChange) this.callbacks.onStateChange('processing');
      if (this.callbacks.onPartial) this.callbacks.onPartial(command);

      if (this.callbacks.onCommand) {
        this.callbacks.onCommand(command);
      }
    }

    // Mark all captured results up to now as consumed so they are never re-evaluated
    this.lastProcessedIndex = Math.max(this.lastProcessedIndex, this.highestResultIndex);
    this.currentCommandText = '';

    setTimeout(() => {
      this.state = 'idle';
      if (this.callbacks.onStateChange) this.callbacks.onStateChange('idle');
      if (this.callbacks.onPartial) this.callbacks.onPartial('');

      // Continuous session remains uninterrupted: recognition is NOT aborted, mic stays hot!
    }, hasValidCommand ? 500 : 100);
  }

  async triggerManual() {
    this.isEnabled = true;
    this.isActive = true;
    await this.ensureAudioStream();
    playWakeChime();

    // Mark past utterances as consumed so manual input starts fresh
    this.lastProcessedIndex = Math.max(this.lastProcessedIndex, this.highestResultIndex);
    this.currentCommandText = '';
    this.state = 'listening';

    if (this.callbacks.onStateChange) this.callbacks.onStateChange('listening');
    if (this.callbacks.onPartial) this.callbacks.onPartial('Listening...');
    this.scheduleSilenceSubmit(3500);
    this.scheduleHardTimeout(7000);

    // If recognition is not already running, start it
    if (!this.recognition && !this.isStarting) {
      this.start();
    }
  }

  cancelManual() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.hardSafetyTimer) clearTimeout(this.hardSafetyTimer);
    this.lastProcessedIndex = Math.max(this.lastProcessedIndex, this.highestResultIndex);
    this.currentCommandText = '';
    this.state = 'idle';
    if (this.callbacks.onStateChange) this.callbacks.onStateChange('idle');
    if (this.callbacks.onPartial) this.callbacks.onPartial('');
  }

  stop() {
    this.isEnabled = false;
    this.isActive = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.hardSafetyTimer) clearTimeout(this.hardSafetyTimer);
    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.state = 'idle';
    if (this.callbacks.onStateChange) this.callbacks.onStateChange('idle');
    if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(false);
  }

  enable() {
    this.activate();
  }
}

export const ultronVoiceEngine = new UltronContinuousVoiceEngine();

export function startWakeWordListener(callbacks) {
  ultronVoiceEngine.init(callbacks);
  return true;
}

export function stopWakeWordListener() {
  ultronVoiceEngine.stop();
}
