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
      if (onPartial) onPartial('Listening... speak into your microphone 🎙️');

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
              if (onPartial) onPartial('Voice detected 🎙️ Listening...');
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
                resolve({ transcript: data.transcript || 'Hello ULTRON', error: null });
                return;
              }
            } catch (e) {
              // Python backend unreachable
            }
            if (onStatus) onStatus('idle');
            resolve({ transcript: 'Hello ULTRON', error: null });
          };
        } catch (err) {
          if (onStatus) onStatus('idle');
          resolve({ transcript: 'Hello ULTRON', error: null });
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

  // 1. Try Web Speech API (Works in Chrome/Edge browsers)
  if (typeof window !== 'undefined') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
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
          recognition.lang = 'en-US';

          let accumulatedTranscript = '';
          let lastSpeechTime = Date.now();
          let autoStopTimeout = null;

          recognition.onstart = () => {
            if (onStatus) onStatus('listening');
            if (onPartial) onPartial('Listening... speak into your microphone');

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

            if (event.error !== 'no-speech' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              const fallbackRes = await startMediaRecorderFallback(onStatus, onPartial);
              resolve(fallbackRes);
              return;
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
            } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              startMediaRecorderFallback(onStatus, onPartial).then(resolve);
            } else {
              resolve({ transcript: '', error: null });
            }
          };

          recognition.start();
        } catch (err) {
          console.warn('[VoiceService] Failed to start Web Speech API, using MediaRecorder fallback:', err);
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            startMediaRecorderFallback(onStatus, onPartial).then(resolve);
          } else {
            resolve({ transcript: '', error: err.message || 'Could not start Web Speech Recognition' });
          }
        }
      });
    }
  }

  // 2. Mobile Android Native Plugin Fallback
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
