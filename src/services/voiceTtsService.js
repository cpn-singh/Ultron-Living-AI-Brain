import { safeFetchPost } from './safeFetchService';
import { ultronVoiceEngine } from './voiceService';

/**
 * ULTRON Speech Synthesis (TTS) & Living Voice Companion Service
 * High-definition Natural Neural Web Speech API + Intelligent Human Prosody.
 * Produces deep, charismatic, human-like voice delivery without synthetic/robotic artifacts.
 */

export const VOICE_PROFILES = {
  ultron_prime: { 
    name: "Ultron Prime (Deep, Commanding Studio Male)", 
    gender: 'male', 
    lang: 'en-US', 
    pitch: 0.90, 
    rate: 0.98,
    preferred: ['christopher', 'guy', 'ryan', 'eric', 'andrew', 'google uk english male', 'george', 'david']
  },
  ultron_jarvis: { 
    name: "Ultron Jarvis (Sophisticated British Studio Male)", 
    gender: 'male', 
    lang: 'en-GB', 
    pitch: 0.94, 
    rate: 0.98,
    preferred: ['george', 'oliver', 'google uk english male', 'alfie', 'daniel', 'hazel', 'susan']
  },
  ultron_kabir: { 
    name: "Ultron Kabir (Charismatic Indian English & Hindi Male)", 
    gender: 'male', 
    lang: 'en-IN', 
    pitch: 0.88, 
    rate: 0.96,
    preferred: ['prabhat', 'madhur', 'aarav', 'hemant', 'google हिन्दी', 'neerja', 'ravi']
  },
  in_priya: { 
    name: "Priya (Articulate Indian English Female)", 
    gender: 'female', 
    lang: 'en-IN', 
    pitch: 1.02, 
    rate: 0.98,
    preferred: ['neerja', 'heera', 'kalpana', 'priya', 'google हिन्दी']
  },
  af_heart: { 
    name: "Heart (Warm Natural Studio Female)", 
    gender: 'female', 
    lang: 'en-US', 
    pitch: 1.02, 
    rate: 0.98,
    preferred: ['jenny', 'aria', 'samantha', 'zira', 'google us english']
  },
  am_adam: { 
    name: "Adam (Clear Confident Male)", 
    gender: 'male', 
    lang: 'en-US', 
    pitch: 0.85, 
    rate: 1.00,
    preferred: ['guy', 'ryan', 'david']
  },
  bf_emma: { 
    name: "Emma (Elegant British Female)", 
    gender: 'female', 
    lang: 'en-GB', 
    pitch: 1.08, 
    rate: 0.96,
    preferred: ['sonia', 'libby', 'hazel']
  }
};

export const VOICE_OPTIONS = Object.fromEntries(
  Object.entries(VOICE_PROFILES).map(([k, v]) => [k, v.name])
);

let synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
let systemVoices = [];
const activeUtterances = new Set();
let isSpeakingState = false;

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
 * Returns true if Ultron is currently speaking through the speakers.
 */
export function isUltronSpeaking() {
  return isSpeakingState || (synth && synth.speaking);
}

/**
 * Play a subtle futuristic acoustic chime before voice output
 */
export function playAcousticChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {
    // Non-critical audio chime
  }
}

/**
 * Intelligently cleans raw LLM response text for human-like conversational speech:
 * - Strips code blocks, syntax markers, raw URLs, and markdown headers
 * - Converts abbreviations into natural spoken English
 * - Removes robotic emojis and symbols
 * - Keeps conversational flow concise and articulate
 */
export function cleanTextForSpeech(text, isAutoSpoken = false) {
  if (!text) return '';

  let cleaned = text
    // Replace fenced code blocks with natural conversational pointer
    .replace(/```[\s\S]*?```/g, ' I have placed the code in our chat. ')
    // Replace inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Replace markdown links [Label](url) with Label
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bare URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove markdown headers #, ##, ###
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bullet points and list numbering
    .replace(/^[\*\-+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Remove blockquotes >
    .replace(/^>\s+/gm, '')
    // Remove bold, italic, strikethrough markdown
    .replace(/[*_~]{1,3}(.*?)[*_~]{1,3}/g, '$1')
    // Remove emojis and decorative Unicode symbols
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    // Clean technical brackets and noise symbols
    .replace(/[|\\{}[\]<>^~]/g, ' ')
    // Human pronunciation substitutions
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bi\.e\./gi, 'that is')
    .replace(/\bvs\b/gi, 'versus')
    .replace(/\bAI\b/g, 'A I')
    .replace(/\bUI\b/g, 'U I')
    .replace(/\bAPI\b/g, 'A P I')
    // Normalize punctuation spacing
    .replace(/\s+/g, ' ')
    .trim();

  // If automatically spoken from an interactive voice turn, summarize long technical outputs
  if (isAutoSpoken && cleaned.length > 320) {
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length > 1) {
      let excerpt = '';
      for (const s of sentences) {
        if ((excerpt + s).length > 280) break;
        excerpt += s + ' ';
      }
      if (excerpt.trim()) {
        cleaned = excerpt.trim() + ' Full technical details are displayed in our chat.';
      }
    }
  }

  return cleaned;
}

/**
 * Finds the highest quality, most natural system voice:
 * Strongly prioritizes modern Neural / Online / Natural voices (e.g. Christopher Online Natural,
 * Guy Online Natural, Google UK English Male) over outdated, robotic desktop synthesizers.
 */
function findBestSystemVoice(profile) {
  if (!synth || systemVoices.length === 0) return null;

  const preferred = profile.preferred || [];
  const isFemale = profile.gender === 'female';

  // Tier 1: Match preferred names against high-definition Online/Natural/Neural voices
  for (const pref of preferred) {
    const match = systemVoices.find(v => {
      const name = v.name.toLowerCase();
      const isNatural = name.includes('natural') || name.includes('online') || name.includes('neural') || name.includes('google');
      return isNatural && name.includes(pref);
    });
    if (match) return match;
  }

  // Tier 2: Any Online / Natural voice matching gender and language
  const naturalGenderMatch = systemVoices.find(v => {
    const name = v.name.toLowerCase();
    const isNatural = name.includes('natural') || name.includes('online') || name.includes('neural') || name.includes('google');
    if (!isNatural) return false;

    const matchesGender = isFemale 
      ? (name.includes('female') || name.includes('jenny') || name.includes('aria') || name.includes('neerja') || name.includes('zira'))
      : (name.includes('male') || name.includes('guy') || name.includes('christopher') || name.includes('ryan') || name.includes('prabhat') || name.includes('george'));

    return matchesGender;
  });
  if (naturalGenderMatch) return naturalGenderMatch;

  // Tier 3: Any preferred voice regardless of natural tag
  for (const pref of preferred) {
    const match = systemVoices.find(v => v.name.toLowerCase().includes(pref));
    if (match) return match;
  }

  // Tier 4: Language code match
  const langPrefix = profile.lang.slice(0, 2).toLowerCase();
  const langMatch = systemVoices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (langMatch) return langMatch;

  // Tier 5: First available voice
  return systemVoices[0] || null;
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
 * Speaks text using high-fidelity natural speech synthesis with acoustic echo cancellation.
 */
export function speakText(text, options = {}) {
  const {
    voiceKey = localStorage.getItem('ultron_tts_voice') || 'ultron_prime',
    speed = parseFloat(localStorage.getItem('ultron_voice_speed') || '1.0'),
    humanCompanion = localStorage.getItem('ultron_human_companion') !== 'false',
    isAutoSpoken = false
  } = options;

  const cleanText = cleanTextForSpeech(text, isAutoSpoken);
  if (!cleanText) return;

  // Signal UI and mute self-listening so Ultron's words don't trigger the microphone
  isSpeakingState = true;
  if (ultronVoiceEngine && ultronVoiceEngine.pauseSelfListening) {
    ultronVoiceEngine.pauseSelfListening();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ultron-speaking-start', { detail: { text: cleanText } }));
  }

  if (humanCompanion && !isAutoSpoken) {
    playAcousticChime();
  }

  if (!synth) {
    fallbackPythonTts(cleanText, voiceKey, speed);
    return;
  }

  try {
    // Cancel prior speech & ensure engine is active
    synth.cancel();
    activeUtterances.clear();
    if (synth.paused) synth.resume();

    if (systemVoices.length === 0) {
      systemVoices = synth.getVoices() || [];
    }

    const profile = VOICE_PROFILES[voiceKey] || VOICE_PROFILES.ultron_prime;
    const bestVoice = findBestSystemVoice(profile);

    // Split long text into natural sentence chunks to prevent WebKit speech clipping
    const sentences = cleanText.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(s => s.trim()).filter(Boolean) || [cleanText];
    let remainingSentences = sentences.length;

    const cleanupSpeaking = () => {
      isSpeakingState = false;
      if (ultronVoiceEngine && ultronVoiceEngine.resumeSelfListening) {
        ultronVoiceEngine.resumeSelfListening();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ultron-speaking-end'));
      }
    };

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (!trimmed) {
        remainingSentences--;
        if (remainingSentences <= 0) cleanupSpeaking();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.pitch = profile.pitch;
      utterance.rate = Math.max(0.6, Math.min(1.8, speed * profile.rate));
      utterance.volume = 1.0;

      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang || profile.lang;
      }

      // Chromium Garbage Collection Bug Safeguard
      activeUtterances.add(utterance);

      utterance.onend = () => {
        activeUtterances.delete(utterance);
        remainingSentences--;
        if (remainingSentences <= 0) {
          cleanupSpeaking();
        }
      };

      utterance.onerror = (e) => {
        console.warn('[VoiceTTS] Utterance error, falling back:', e);
        activeUtterances.delete(utterance);
        remainingSentences--;
        if (remainingSentences <= 0) {
          cleanupSpeaking();
        }
        if (index === 0) {
          fallbackPythonTts(cleanText, voiceKey, speed);
        }
      };

      synth.speak(utterance);
    });

  } catch (err) {
    console.warn('[VoiceTTS] Web Speech exception:', err);
    isSpeakingState = false;
    if (ultronVoiceEngine && ultronVoiceEngine.resumeSelfListening) {
      ultronVoiceEngine.resumeSelfListening();
    }
    fallbackPythonTts(cleanText, voiceKey, speed);
  }
}

/**
 * Stop any current speech and immediately re-arm microphone
 */
export function stopSpeech() {
  if (synth) {
    try {
      synth.cancel();
    } catch (e) {}
  }
  activeUtterances.clear();
  isSpeakingState = false;

  if (ultronVoiceEngine && ultronVoiceEngine.resumeSelfListening) {
    ultronVoiceEngine.resumeSelfListening();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ultron-speaking-end'));
  }
}

/**
 * Test a specific voice selection
 */
export function testVoice(voiceKey) {
  const profile = VOICE_PROFILES[voiceKey] || VOICE_PROFILES.ultron_prime;
  speakText(`Greetings! I am Ultron. Speech synthesis core is fully operational and tuned for natural human cadence.`, { voiceKey, humanCompanion: false });
}
