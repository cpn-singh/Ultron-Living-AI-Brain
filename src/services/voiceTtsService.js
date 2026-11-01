import { safeFetchPost } from './safeFetchService';

/**
 * Nemio & ULTRON Speech Synthesis (TTS) & Voice Companion Service
 * High-reliability Web Speech API + Python Native SAPI5 Fallback
 * Formats all 10 voices with unique pitch, frequency, & acoustic profiles.
 */

export const VOICE_PROFILES = {
  in_priya:    { name: "Priya (Indian English Articulate Female)", gender: 'female', lang: 'en-IN', pitch: 1.05, rate: 0.98 },
  in_aarav:    { name: "Aarav (Indian English Confident Male)",     gender: 'male',   lang: 'en-IN', pitch: 0.82, rate: 0.98 },
  hi_ananya:   { name: "Ananya (Hindi Warm Female - हिन्दी)",      gender: 'female', lang: 'hi-IN', pitch: 1.10, rate: 0.95 },
  hi_kabir:    { name: "Kabir (Hindi Deep Male - हिन्दी)",         gender: 'male',   lang: 'hi-IN', pitch: 0.78, rate: 0.95 },
  af_heart:    { name: "Heart (Warm & Intimate Female)",    gender: 'female', lang: 'en-US', pitch: 1.05, rate: 0.95 },
  af_bella:    { name: "Bella (Smooth & Articulate Female)", gender: 'female', lang: 'en-US', pitch: 1.20, rate: 1.00 },
  af_sarah:    { name: "Sarah (Soft & Friendly Female)",     gender: 'female', lang: 'en-US', pitch: 1.35, rate: 1.05 },
  af_sky:      { name: "Sky (Bright & Youthful Female)",     gender: 'female', lang: 'en-US', pitch: 1.50, rate: 1.10 },
  af_nicole:   { name: "Nicole (Calm & Whispery Female)",   gender: 'female', lang: 'en-US', pitch: 0.90, rate: 0.88 },
  am_adam:     { name: "Adam (Clear & Confident Male)",      gender: 'male',   lang: 'en-US', pitch: 0.75, rate: 1.00 },
  am_michael:  { name: "Michael (Warm & Conversational Male)", gender: 'male', lang: 'en-US', pitch: 0.85, rate: 0.95 },
  bf_emma:     { name: "Emma (Elegant British Female)",      gender: 'female', lang: 'en-GB', pitch: 1.15, rate: 0.95 },
  bf_isabella: { name: "Isabella (Gentle British Female)",   gender: 'female', lang: 'en-GB', pitch: 1.28, rate: 0.90 },
  bm_george:   { name: "George (Classic British Male)",      gender: 'male',   lang: 'en-GB', pitch: 0.70, rate: 0.92 }
};

export const VOICE_OPTIONS = Object.fromEntries(
  Object.entries(VOICE_PROFILES).map(([k, v]) => [k, v.name])
);

let synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
let systemVoices = [];
const activeUtterances = new Set(); // Prevent Chromium Garbage Collection Bug

// Pre-load voices on startup
if (synth) {
  const updateVoices = () => {
    try {
      systemVoices = synth.getVoices() || [];
    } catch (e) {
      systemVoices = [];
    }
  };
  updateVoices();
  if (typeof window !== 'undefined' && synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = updateVoices;
  }
}

/**
 * Play a pleasant acoustic chime before voice output
 */
export function playAcousticChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5 note

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // ignore audio context failures
  }
}

/**
 * Clean text of markdown, code blocks, URLs, and formatting
 */
export function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[#*~_|\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback speak via Python backend SAPI5 service
 */
async function fallbackPythonTts(text, profileKey, speed) {
  try {
    await safeFetchPost('http://127.0.0.1:8000/api/tts', { text, voiceKey: profileKey, speed });
  } catch (err) {
    console.warn('[VoiceTTS] Python fallback TTS error:', err);
  }
}

/**
 * Speak text using Web Speech API with sentence chunking & GC protection
 */
export function speakText(text, options = {}) {
  const {
    voiceKey = localStorage.getItem('ultron_tts_voice') || 'af_heart',
    speed = parseFloat(localStorage.getItem('ultron_voice_speed') || '1.0'),
    humanCompanion = localStorage.getItem('ultron_human_companion') !== 'false'
  } = options;

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) return;

  if (humanCompanion) {
    playAcousticChime();
  }

  if (!synth) {
    fallbackPythonTts(cleanText, voiceKey, speed);
    return;
  }

  try {
    // Cancel prior speech & ensure engine is resumed (Chromium fix)
    synth.cancel();
    if (synth.paused) synth.resume();

    if (systemVoices.length === 0) {
      systemVoices = synth.getVoices() || [];
    }

    const profile = VOICE_PROFILES[voiceKey] || VOICE_PROFILES.af_heart;
    
    // Split long text into natural sentence chunks to prevent 15-second speech truncation bug
    const sentences = cleanText.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(s => s.trim()).filter(Boolean) || [cleanText];
    
    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) return;

      const utterance = new SpeechSynthesisUtterance(trimmedSentence);
      
      utterance.pitch = profile.pitch;
      utterance.rate = Math.max(0.5, Math.min(2.0, speed * profile.rate));

      // Match system voice
      if (systemVoices.length > 0) {
        const isFemale = profile.gender === 'female';
        const isBritish = profile.lang.includes('GB');
        const isIndian = profile.lang.includes('IN') || profile.lang.includes('hi');

        let matched = systemVoices.find(v => {
          const n = v.name.toLowerCase();
          const l = v.lang.toLowerCase();

          if (isIndian && (l.includes('in') || l.includes('hi') || n.includes('india') || n.includes('hindi') || n.includes('heera') || n.includes('neerja') || n.includes('kalpana') || n.includes('hemant') || n.includes('prabhat'))) {
            if (isFemale && (n.includes('female') || n.includes('neerja') || n.includes('heera') || n.includes('kalpana') || n.includes('priya'))) return true;
            if (!isFemale && (n.includes('male') || n.includes('hemant') || n.includes('prabhat') || n.includes('aarav') || n.includes('ravi'))) return true;
            return true;
          }
          if (isBritish && (l.includes('gb') || n.includes('uk') || n.includes('british'))) {
            if (isFemale && (n.includes('female') || n.includes('zira') || n.includes('hazel') || n.includes('susan'))) return true;
            if (!isFemale && (n.includes('male') || n.includes('george') || n.includes('david'))) return true;
          }
          if (isFemale && (n.includes('female') || n.includes('zira') || n.includes('samantha') || n.includes('eva') || n.includes('jenny'))) return true;
          if (!isFemale && (n.includes('male') || n.includes('david') || n.includes('mark') || n.includes('alex'))) return true;
          return false;
        });

        if (!matched) {
          matched = systemVoices.find(v => isFemale ? (v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('female')) : (v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('male'))) || systemVoices[0];
        }

        if (matched) {
          utterance.voice = matched;
        }
      }

      // Garbage Collection Protection
      activeUtterances.add(utterance);

      utterance.onend = () => {
        activeUtterances.delete(utterance);
      };

      utterance.onerror = (e) => {
        console.warn('[VoiceTTS] Utterance error, attempting fallback:', e);
        activeUtterances.delete(utterance);
        if (index === 0) {
          fallbackPythonTts(cleanText, voiceKey, speed);
        }
      };

      synth.speak(utterance);
    });

  } catch (err) {
    console.warn('[VoiceTTS] Web Speech exception:', err);
    fallbackPythonTts(cleanText, voiceKey, speed);
  }
}

/**
 * Stop any current speech
 */
export function stopSpeech() {
  if (synth) {
    try {
      synth.cancel();
    } catch (e) {}
  }
  activeUtterances.clear();
}

/**
 * Test a specific voice selection
 */
export function testVoice(voiceKey) {
  const profile = VOICE_PROFILES[voiceKey] || VOICE_PROFILES.af_heart;
  speakText(`Hello! This is ${profile.name}. Your speech engine is fully operational on ULTRON.`, { voiceKey, humanCompanion: true });
}
