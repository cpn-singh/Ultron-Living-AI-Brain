import { registerPlugin, Capacitor } from '@capacitor/core';
import { safeFetchPost } from './safeFetchService';
import { musicPlayer } from './musicPlayerService';

// Register native plugin for Capacitor mobile
const UltronVoice = registerPlugin('UltronVoice', {
  web: async () => ({
    isAvailable: async () => ({ available: false }),
    startListening: async () => ({ transcript: '', error: 'Web fallback' }),
    stopListening: async () => ({}),
  }),
});

/**
 * Detect if running inside an Android browser (not native Capacitor app).
 */
function isAndroidBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /android/i.test(ua) && !Capacitor.isNativePlatform();
}

/**
 * Intelligent deduplication for Android Chrome speech recognition glitches.
 * Strips doubled phrases (e.g. "play song play song" -> "play song")
 * and duplicate repeated words ("play play song" -> "play song").
 */
export function dedupeTranscript(text) {
  if (!text) return '';
  let s = text.trim().replace(/\s+/g, ' ');

  // 1. Exact halving: "play Kas ka song play Kas ka song" -> "play Kas ka song"
  const words = s.split(' ');
  if (words.length >= 2 && words.length % 2 === 0) {
    const mid = words.length / 2;
    const firstHalf = words.slice(0, mid).join(' ');
    const secondHalf = words.slice(mid).join(' ');
    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
      return firstHalf;
    }
  }

  // 2. Repeated sentence / sub-phrase chunks
  for (let len = Math.floor(words.length / 2); len >= 2; len--) {
    for (let i = 0; i <= words.length - 2 * len; i++) {
      const p1 = words.slice(i, i + len).join(' ').toLowerCase();
      const p2 = words.slice(i + len, i + 2 * len).join(' ').toLowerCase();
      if (p1 === p2) {
        words.splice(i + len, len);
        s = words.join(' ');
        break;
      }
    }
  }

  // 3. Repeated single words: "play play song song" -> "play song"
  s = s.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  return s.trim();
}

/**
 * Returns true if the Web Speech API is available in the current browser.
 * Modern Android Chrome (v33+) supports webkitSpeechRecognition natively.
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
    if (isWebSpeechAvailable()) return true;
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
 * Request audio microphone permissions from the browser.
 * Uses navigator.permissions query when available.
 * CRITICAL FOR ANDROID CHROME: Never call getUserMedia here!
 * On Android Chrome, getUserMedia locks the hardware audio recording channel, causing Google Speech Services
 * to throw: "Speech Recognition and Synthesis from Google cannot record now as Browser is recording"
 * SpeechRecognition natively manages its own permissions dialog.
 */
export async function requestMicrophonePermission() {
  if (typeof window === 'undefined') return false;

  // 1. Check if permission is already granted via Permissions API
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' });
      if (perm.state === 'granted') return true;
    } catch (e) {}
  }

  // 2. Explicitly trigger browser microphone permission dialog via getUserMedia,
  // then IMMEDIATELY stop and release all hardware tracks so Google Speech Services can record freely.
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // CRITICAL: Immediately stop all tracks to release hardware recording channel
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.warn('[UltronVoice] getUserMedia prompt declined or failed:', err);
      return false;
    }
  }

  return isWebSpeechAvailable();
}

/**
 * Synthesizes a futuristic two-tone confirmation chime using Web Audio API
 */
let sharedAudioCtx = null;
let audioContextUnlocked = false;

export function unlockAudioContext() {
  if (audioContextUnlocked && sharedAudioCtx && sharedAudioCtx.state === 'running') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().then(() => {
        audioContextUnlocked = true;
      }).catch(() => {});
    } else if (sharedAudioCtx.state === 'running') {
      audioContextUnlocked = true;
    }
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    unlockAudioContext();
  };
  window.addEventListener('click', handleInteraction, { passive: true });
  window.addEventListener('touchstart', handleInteraction, { passive: true });
  window.addEventListener('keydown', handleInteraction, { passive: true });
}

function getAudioContext() {
  try {
    if (!sharedAudioCtx) {
      unlockAudioContext();
    }
    if (!sharedAudioCtx || sharedAudioCtx.state !== 'running') {
      if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
      }
      return null;
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

export function playWakeChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
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
 * - Indian English & accents: "hey ultron", "ultron", "ultra", "altron", "aaltron", "eltron", "oltron", "voltron", "waltron", "electron", "all tron", "old tron", "haltron", "all turn", "al turn", "all trone", "alt ron"
 * - Hinglish prefixes: "arre ultron", "arey ultron", "suno ultron", "sun ultron", "bhai ultron", "oye ultron", "namaste ultron"
 * - Hindi (Devanagari): "हे अल्ट्रॉन", "अरे अल्ट्रॉन", "सुनो अल्ट्रॉन", "अल्ट्रॉन", "अल्ट्रा", "अलट्रान", "अलट्रोन", "नमस्ते अल्ट्रॉन"
 */
export const WAKE_WORD_REGEX = new RegExp(
  '(?:' +
    '\\b(?:hey|hi|he|ha|hello|ok|okay|listen|arre|arey|are|ae|aye|ay|suno|sun|bhai|oye|o|namaste|yo)?' +
    '[\\s,.\'\\"-]*' +
    '(?:ultron|altron|aaltron|ultra|eltron|oltron|voltron|waltron|electron|all\\s*tron|old\\s*tron|haltron|ultran|altran|outrun|outron|el\\s*drone|all\\s*drone|old\\s*drone|all\\s*turn|al\\s*turn|all\\s*trone|alt\\s*ron)\\b' +
  ')|' +
  '(?:' +
    '(?:हे|अरे|सुनो|सुन|भाई|ओ|नमस्ते)?' +
    '[\\s,.\'\\"-]*' +
    '(?:अल्ट्रॉन|अल्ट्रोन|अल्ट्रा|अलट्रान|अलट्रॉन|ओल्ट्रॉन|एलट्रॉन|इलेक्ट्रॉन)' +
  ')',
  'i'
);

/**
 * Natural voice interruption keywords for duplex barge-in:
 * Allows user to interrupt Ultron while he is speaking by saying "Stop", "Quiet", "Ruko", "Wait", etc.
 */
export const INTERRUPTION_REGEX = new RegExp(
  '\\b(?:stop|shutup|shut\\s*up|quiet|silence|pause|cancel|halt|wait|hold\\s*on|enough|ruk|ruko|chup|bas|suno|sun|chup\\s*raho|arey\\s*ruk|ek\\s*minute|listen|listen\\s*to\\s*me)\\b',
  'i'
);

/**
 * Extracts voice command following the wake word.
 */
export function extractCommandAfterWakeWord(text) {
  if (!text) return '';
  return text
    .replace(
      new RegExp(
        '^.*?(?:' +
          '\\b(?:hey|hi|he|ha|hello|ok|okay|listen|arre|arey|are|ae|aye|ay|suno|sun|bhai|oye|o|namaste|yo)?' +
          '[\\s,.\'\\"-]*' +
          '(?:ultron|altron|aaltron|ultra|eltron|oltron|voltron|waltron|electron|all\\s*tron|old\\s*tron|haltron|ultran|altran|outrun|outron|el\\s*drone|all\\s*drone|old\\s*drone|all\\s*turn|al\\s*turn|all\\s*trone|alt\\s*ron)\\b' +
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
 * UNIFIED ULTRON CONTINUOUS SPEECH & WAKE WORD ENGINE
 * Maintains a single, continuous, non-blocking Web Speech API stream.
 * Automatically recognizes "Hey Ultron" / "Ultron" + questions with 0ms hardware renegotiation.
 */
class UltronContinuousVoiceEngine {
  constructor() {
    this.recognition = null;
    this.state = 'idle'; // 'idle' | 'listening' | 'processing'
    this.isEnabled = true;
    this.isActive = false;
    this.callbacks = {};
    this.silenceTimer = null;
    this.hardSafetyTimer = null;
    this.restartTimer = null;
    this.selfSpeakingTimeout = null;
    this.currentCommandText = '';
    this.lastReportedCommand = '';
    this.lastSpokenChangeTime = 0;
    this.isStarting = false;
    this.isSelfSpeaking = false;
    this.processedIndex = 0;
    this.latestResultsLength = 0;
    this.manualTriggerActive = false;
    this.manualResolve = null;
    this.lastSubmittedTs = 0;
    this.lastSubmittedCommand = '';
    this.isPausedForMedia = false;
  }

  isMediaPlaying() {
    try {
      return !!(musicPlayer && musicPlayer.state && musicPlayer.state.isPlaying);
    } catch (e) {
      return false;
    }
  }

  isMediaPlayingOnAndroid() {
    return isAndroidBrowser() && (this.isPausedForMedia || this.isMediaPlaying());
  }

  pauseContinuousForMedia() {
    this.isPausedForMedia = true;
    if (this.recognition && !this.manualTriggerActive) {
      try {
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }
  }

  resumeContinuousFromMedia() {
    this.isPausedForMedia = false;
    if (this.isEnabled && this.isActive && !this.recognition && !this.isStarting && (!isAndroidBrowser() || !this.isMediaPlaying())) {
      setTimeout(() => this.start(), 500);
    }
  }

  setState(newState) {
    this.state = newState;

    // Intelligent Audio Ducking: lowers music volume when listening to user on Desktop
    // On Android browser, avoid setVolume calls that trigger OS audio pauses
    try {
      if (!isAndroidBrowser()) {
        if (newState === 'listening' && musicPlayer.state.isPlaying) {
          musicPlayer.setVolume(0.2);
        } else if (newState === 'idle' && musicPlayer.state.isPlaying) {
          musicPlayer.setVolume(0.85);
        }
      }
    } catch (e) {}

    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(newState);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ultron-voice-state', { detail: { state: newState } }));
    }
  }

  async ensureAudioStream() {
    return await requestMicrophonePermission();
  }

  interruptSpeech() {
    this.isSelfSpeaking = false;
    if (this.selfSpeakingTimeout) {
      clearTimeout(this.selfSpeakingTimeout);
      this.selfSpeakingTimeout = null;
    }
    if (typeof window !== 'undefined') {
      if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      window.dispatchEvent(new CustomEvent('ultron-speaking-end'));
      window.dispatchEvent(new CustomEvent('ultron-speaking-stop'));
    }
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
      this.isSelfSpeaking = false;
    }, 200);
  }

  init(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.isEnabled = localStorage.getItem('ultron_wake_word') !== 'false';

    if (typeof window !== 'undefined' && !this.mediaListenersAttached) {
      this.mediaListenersAttached = true;
      window.addEventListener('ultron-media-playing', () => this.pauseContinuousForMedia());
      window.addEventListener('ultron-media-paused', () => this.resumeContinuousFromMedia());
    }

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
    await requestMicrophonePermission();
    if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(true);
    if (this.callbacks.onPermissionStatus) this.callbacks.onPermissionStatus(true);
    this.start();
  }

  async start() {
    if (typeof window === 'undefined') return;

    // Never auto-start continuous background mic if media is actively playing on mobile (avoids Android OS audio pause loop)
    if (isAndroidBrowser() && this.isMediaPlaying() && !this.manualTriggerActive) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[UltronVoice] Web Speech API not supported in this browser.');
      return;
    }

    if (this.recognition || this.isStarting) return;
    this.isStarting = true;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    try {
      const recognition = new SpeechRecognition();
      this.recognition = recognition;
      // Keep continuous listening enabled across platforms
      // On modern Android Chrome, continuous = true allows hands-free wake word detection without dropping out after every phrase
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = getSpeechLanguage();

      recognition.onstart = () => {
        this.isStarting = false;
        this.isActive = true;
        this.processedIndex = 0;
        this.latestResultsLength = 0;
        if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(true);
        if (this.callbacks.onPermissionStatus) this.callbacks.onPermissionStatus(true);
        console.log('[UltronVoice] Continuous automatic recognition active & listening.');
      };

      recognition.onresult = (event) => {
        if (typeof window !== 'undefined' && (!window.speechSynthesis || !window.speechSynthesis.speaking)) {
          this.isSelfSpeaking = false;
        }

        this.latestResultsLength = event.results.length;

        let interim = '';
        let final = '';

        const startIndex = isAndroidBrowser() ? 0 : this.processedIndex;
        for (let i = startIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            final += ' ' + res[0].transcript;
          } else {
            interim += ' ' + res[0].transcript;
          }
        }

        const rawSpoken = dedupeTranscript((final + ' ' + interim).trim());
        if (!rawSpoken) return;

        const normalizedSpoken = rawSpoken.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/gu, ' ').replace(/\s+/g, ' ').trim();

        // Duplex Barge-in check if Ultron is currently speaking
        const isSpeakingNow = (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) || this.isSelfSpeaking;
        if (isSpeakingNow) {
          const isInterruption = INTERRUPTION_REGEX.test(rawSpoken) || INTERRUPTION_REGEX.test(normalizedSpoken);
          const hasWakeWord = WAKE_WORD_REGEX.test(rawSpoken) || WAKE_WORD_REGEX.test(normalizedSpoken);

          if (isInterruption || hasWakeWord) {
            console.log('[UltronVoice] Voice barge-in detected. Stopping TTS playback.');
            this.interruptSpeech();

            if (hasWakeWord) {
              // User interrupted by addressing Ultron ("Hey Ultron ...")
              playWakeChime();
              const followingCommand = extractCommandAfterWakeWord(rawSpoken);
              this.setState('listening');
              this.manualTriggerActive = false;
              this.currentCommandText = followingCommand;
              this.lastReportedCommand = followingCommand;
              this.lastSpokenChangeTime = Date.now();

              if (this.callbacks.onWake) {
                this.callbacks.onWake({ raw: rawSpoken, command: followingCommand });
              }

              if (followingCommand && followingCommand.length > 1) {
                if (this.callbacks.onPartial) this.callbacks.onPartial(followingCommand);
                this.scheduleSilenceSubmit(1100);
              } else {
                if (this.callbacks.onPartial) this.callbacks.onPartial('Listening, speak now...');
                this.scheduleSilenceSubmit(3800);
              }
              this.scheduleHardTimeout(7000);
              return;
            }

            // User said "stop" / "quiet" / "ruko"
            this.processedIndex = event.results.length;
            this.setState('idle');
            if (this.callbacks.onPartial) this.callbacks.onPartial('Ultron silenced');
            setTimeout(() => {
              if (this.state === 'idle' && this.callbacks.onPartial) this.callbacks.onPartial('');
            }, 1200);
            return;
          }
          // Ignore speaker output feedback
          return;
        }

        // STATE 1: IDLE (Wake word detection)
        if (this.state === 'idle') {
          if (WAKE_WORD_REGEX.test(rawSpoken) || WAKE_WORD_REGEX.test(normalizedSpoken)) {
            playWakeChime();

            const followingCommand = extractCommandAfterWakeWord(rawSpoken);
            this.setState('listening');
            this.manualTriggerActive = false;
            this.currentCommandText = followingCommand;
            this.lastReportedCommand = followingCommand;
            this.lastSpokenChangeTime = Date.now();

            if (this.callbacks.onWake) {
              this.callbacks.onWake({ raw: rawSpoken, command: followingCommand });
            }

            if (followingCommand && followingCommand.length > 1) {
              if (this.callbacks.onPartial) this.callbacks.onPartial(followingCommand);
              this.scheduleSilenceSubmit(1100);
            } else {
              if (this.callbacks.onPartial) this.callbacks.onPartial('Listening, speak now...');
              this.scheduleSilenceSubmit(3800);
            }
            this.scheduleHardTimeout(7000);
          }
        }
        // STATE 2: LISTENING (Voice command capture)
        else if (this.state === 'listening') {
          const cleanCommand = this.manualTriggerActive
            ? rawSpoken.trim()
            : (extractCommandAfterWakeWord(rawSpoken) || rawSpoken || '').trim();

          const textChanged = cleanCommand !== this.lastReportedCommand;
          this.currentCommandText = cleanCommand;

          if (textChanged) {
            this.lastReportedCommand = cleanCommand;
            this.lastSpokenChangeTime = Date.now();
            if (this.callbacks.onPartial) {
              this.callbacks.onPartial(cleanCommand);
            }
          }

          if (cleanCommand.length > 0) {
            this.scheduleSilenceSubmit(1100);
          } else {
            this.scheduleSilenceSubmit(3500);
          }
        }
      };

      recognition.onerror = (event) => {
        this.isStarting = false;
        // Harmless or expected events
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        console.warn('[UltronVoice] Recognition status:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn('[UltronVoice] Microphone permission denied');
          this.setState('idle');
          if (this.callbacks.onPermissionStatus) this.callbacks.onPermissionStatus(false);
          if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(false);
          if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            if (this.callbacks.onPartial) {
              this.callbacks.onPartial('Chrome blocks mic over HTTP. Please use HTTPS link.');
            }
          }
          return;
        }

        // Fatal errors will trigger onend naturally; do not restart here to avoid duplicate instances
      };

      recognition.onend = () => {
        this.isStarting = false;
        this.recognition = null;
        this.processedIndex = 0;
        this.latestResultsLength = 0;

        // Auto-restart continuous recognition automatically whenever media is not playing
        const shouldRestart = this.isEnabled && this.isActive && !this.isMediaPlaying();

        if (shouldRestart) {
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (this.isEnabled && this.isActive && !this.recognition && !this.isStarting && !this.isMediaPlaying()) {
              this.start();
            }
          }, isAndroidBrowser() ? 500 : 400);
        } else {
          this.setState('idle');
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

  scheduleSilenceSubmit(timeoutMs = 1100) {
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

    // Advance processedIndex so previous results are not re-processed
    if (this.latestResultsLength > this.processedIndex) {
      this.processedIndex = this.latestResultsLength;
    }

    const command = (this.currentCommandText || '').trim();
    const cleanCommand = dedupeTranscript(command.replace(/^["'\s,.\-]+|["'\s,.\-]+$/g, '').trim());
    const nonWakePart = cleanCommand.replace(WAKE_WORD_REGEX, '').trim();
    const hasValidCommand = cleanCommand.length > 1 && (this.manualTriggerActive || nonWakePart.length > 0);

    // Guard against duplicate rapid submission on Android Chrome
    const now = Date.now();
    if (now - this.lastSubmittedTs < 1500 && cleanCommand.toLowerCase() === this.lastSubmittedCommand.toLowerCase()) {
      console.log('[UltronVoice] Suppressing duplicate rapid submission on Android Chrome:', cleanCommand);
      this.currentCommandText = '';
      return;
    }

    if (hasValidCommand) {
      this.lastSubmittedTs = now;
      this.lastSubmittedCommand = cleanCommand;
      this.setState('processing');
      if (this.callbacks.onPartial) this.callbacks.onPartial(cleanCommand);

      // If manual trigger was waiting (e.g. ChatDrawer mic button), resolve it directly
      if (this.manualResolve) {
        this.manualResolve({ transcript: cleanCommand, error: null });
        this.manualResolve = null;
      } else if (this.callbacks.onCommand) {
        // Continuous wake word trigger -> send to main app orchestrator
        this.callbacks.onCommand(cleanCommand);
      }
    } else {
      if (this.manualResolve) {
        this.manualResolve({ transcript: '', error: null });
        this.manualResolve = null;
      }
    }

    this.currentCommandText = '';
    this.lastReportedCommand = '';
    this.manualTriggerActive = false;

    setTimeout(() => {
      this.setState('idle');
      if (this.callbacks.onPartial) this.callbacks.onPartial('');
    }, hasValidCommand ? 350 : 80);
  }

  async triggerManual(onDoneCallback) {
    this.isEnabled = true;
    this.isActive = true;
    this.manualTriggerActive = true;
    if (onDoneCallback) {
      this.manualResolve = onDoneCallback;
    }

    // Advance index to ignore old speech
    if (this.latestResultsLength > this.processedIndex) {
      this.processedIndex = this.latestResultsLength;
    }

    playWakeChime();

    this.currentCommandText = '';
    this.lastReportedCommand = '';
    this.lastSpokenChangeTime = Date.now();
    this.setState('listening');

    if (this.callbacks.onPartial) this.callbacks.onPartial('Listening, speak now...');
    this.scheduleSilenceSubmit(3500);
    this.scheduleHardTimeout(7000);

    // On mobile, if media is playing, pause it so mic has clean audio focus without OS interference
    if (this.isMediaPlaying()) {
      musicPlayer.pause();
    }

    // Force clean restart so manual button click ALWAYS captures speech fresh immediately
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }
    this.isStarting = false;
    this.start();
  }

  cancelManual() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.hardSafetyTimer) clearTimeout(this.hardSafetyTimer);

    if (this.latestResultsLength > this.processedIndex) {
      this.processedIndex = this.latestResultsLength;
    }

    if (this.manualResolve) {
      this.manualResolve({ transcript: '', error: null });
      this.manualResolve = null;
    }

    this.currentCommandText = '';
    this.lastReportedCommand = '';
    this.manualTriggerActive = false;
    this.setState('idle');
    if (this.callbacks.onPartial) this.callbacks.onPartial('');
  }

  stop() {
    this.isEnabled = false;
    this.isActive = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.hardSafetyTimer) {
      clearTimeout(this.hardSafetyTimer);
      this.hardSafetyTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }
    this.isStarting = false;
    this.setState('idle');
    if (this.callbacks.onActiveStatus) this.callbacks.onActiveStatus(false);
  }

  enable() {
    this.activate();
  }
}

export const ultronVoiceEngine = new UltronContinuousVoiceEngine();

/**
 * Start voice recognition delegator - integrates smoothly with existing UI callers
 */
export async function startVoiceRecognition({ onStatus, onPartial } = {}) {
  return new Promise((resolve) => {
    ultronVoiceEngine.triggerManual((res) => {
      if (onStatus) onStatus('idle');
      resolve(res);
    });

    if (onStatus) onStatus('listening');
  });
}

export async function stopVoiceRecognition() {
  ultronVoiceEngine.cancelManual();
}

export function startWakeWordListener(callbacks) {
  ultronVoiceEngine.init(callbacks);
  return true;
}

export function stopWakeWordListener() {
  ultronVoiceEngine.stop();
}
