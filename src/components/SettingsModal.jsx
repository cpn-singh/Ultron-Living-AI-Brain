import React, { useState } from 'react';
import { X, CheckCircle2, RefreshCw } from 'lucide-react';
import { VOICE_OPTIONS, testVoice } from '../services/voiceTtsService';
import { testNvidiaConnection, testGeminiConnection } from '../services/aiService';
import { checkDbStatus } from '../services/authService';

export default function SettingsModal({ onClose }) {
  const [orbitName, setOrbitName] = useState(() => {
    const val = localStorage.getItem('ultron_user_name');
    if (!val || val.trim() === 'Shiv Loves Gabriela (Chato)' || val.trim() === 'Shiv Loves Gabriela') return 'Shiv';
    return val;
  });
  const [activeModel, setActiveModel] = useState(() => localStorage.getItem('ultron_ai_model') || 'nvidia-nemotron');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('ultron_gemini_key') || 'AQ.Ab8RN6JbJoqII58fggQw7qe7dzbtTY4Yabqr-UZNeteyxmV0CA');
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState('');
  const [nvidiaKey, setNvidiaKey] = useState(() => localStorage.getItem('ultron_nvidia_key') || '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');
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('ultron_tts_voice') || 'ultron_prime');
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('ultron_tts_enabled') !== 'false');
  const [voiceSpeed, setVoiceSpeed] = useState(() => localStorage.getItem('ultron_voice_speed') || '1.0');
  const [humanCompanion, setHumanCompanion] = useState(() => localStorage.getItem('ultron_human_companion') !== 'false');
  const [wakeWord, setWakeWord] = useState(() => localStorage.getItem('ultron_wake_word') !== 'false');
  const [speechLang, setSpeechLang] = useState(() => localStorage.getItem('ultron_speech_lang') || 'en-IN');
  const [statusMsg, setStatusMsg] = useState('');
  const [nvidiaTesting, setNvidiaTesting] = useState(false);
  const [nvidiaStatus, setNvidiaStatus] = useState('');
  const [dbStatus, setDbStatus] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [customBackendUrl, setCustomBackendUrl] = useState(() => localStorage.getItem('ultron_backend_url') || '');

  React.useEffect(() => {
    checkDbStatus().then(st => setDbStatus(st));
  }, []);

  const handleTestDb = async () => {
    setDbLoading(true);
    const res = await checkDbStatus();
    setDbStatus(res);
    setDbLoading(false);
  };

  const handleSave = () => {
    const cleanName = (orbitName || 'Shiv').trim();
    localStorage.setItem('ultron_user_name', cleanName);
    localStorage.setItem('ultron_ai_model', activeModel);
    localStorage.setItem('ultron_gemini_key', geminiKey);
    localStorage.setItem('ultron_nvidia_key', nvidiaKey);
    localStorage.setItem('ultron_tts_voice', selectedVoice);
    localStorage.setItem('ultron_tts_enabled', ttsEnabled ? 'true' : 'false');
    localStorage.setItem('ultron_voice_speed', voiceSpeed);
    localStorage.setItem('ultron_human_companion', humanCompanion ? 'true' : 'false');
    localStorage.setItem('ultron_wake_word', wakeWord ? 'true' : 'false');
    localStorage.setItem('ultron_speech_lang', speechLang);
    if (customBackendUrl.trim()) {
      localStorage.setItem('ultron_backend_url', customBackendUrl.trim());
    } else {
      localStorage.removeItem('ultron_backend_url');
    }
    window.dispatchEvent(new CustomEvent('ultron-wake-word-toggle', { detail: { enabled: wakeWord } }));
    window.dispatchEvent(new CustomEvent('ultron-speech-lang-change', { detail: { lang: speechLang } }));
    
    window.dispatchEvent(new CustomEvent('ultron-name-update', { detail: { name: cleanName } }));
    setStatusMsg('Settings updated successfully');
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 900);
  };

  const handleNameChange = (val) => {
    setOrbitName(val);
    window.dispatchEvent(new CustomEvent('ultron-name-update', { detail: { name: val } }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 pt-14 select-none">
      <div className="w-full max-w-lg p-6 rounded-2xl relative flex flex-col gap-4 border border-white/10 max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-2xl shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-1 border-b border-white/10 pb-3">
          <h2 className="text-base font-semibold tracking-tight text-white">Settings</h2>
          <p className="text-xs text-slate-400">Configure operator identity, inference engines, and speech synthesis.</p>
        </div>

        {statusMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {statusMsg}
          </div>
        )}

        {/* OPERATOR ORBIT IDENTITY SECTION */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">3D Orbit Operator Name</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200">
              Badge
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your name floating on the rotating 3D orbit circle around the atom.
          </p>
          <input
            type="text"
            value={orbitName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. SHIV"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 font-mono tracking-wider uppercase font-bold transition-colors"
          />
        </div>

        {/* ONLINE AI Section */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Inference Engines & Models</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200">
              Active Fleet
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">Primary Inference Engine</label>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 font-sans transition-colors"
              >
                <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (High-Speed & Reasoning)</option>
                <option value="gemini-3.6-flash">Google Gemini 3.6 Flash (Stable Multimodal)</option>
                <option value="deepseek-r1">DeepSeek-R1 via NVIDIA NIM (Deep Reasoning & Math)</option>
                <option value="llama-3.3-70b">Meta LLaMA 3.3 70B (Open Weights Frontier)</option>
                <option value="nvidia-nemotron">NVIDIA Nemotron-70B (Swarm Coordinator)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Google Gemini API Key</label>
                {geminiStatus && (
                  <span className={`text-[11px] font-mono ${geminiStatus.includes('Connected') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {geminiStatus}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    setGeminiStatus('');
                  }}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500 transition-colors"
                />
                <button
                  type="button"
                  disabled={geminiTesting}
                  onClick={async () => {
                    setGeminiTesting(true);
                    setGeminiStatus('Testing...');
                    const res = await testGeminiConnection(geminiKey);
                    setGeminiTesting(false);
                    setGeminiStatus(res.message);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Test Gemini API Connection"
                >
                  {geminiTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" /> : 'Test'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">NVIDIA NIM API Key</label>
                {nvidiaStatus && (
                  <span className={`text-[11px] font-mono ${nvidiaStatus.includes('Connected') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {nvidiaStatus}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={nvidiaKey}
                  onChange={(e) => {
                    setNvidiaKey(e.target.value);
                    setNvidiaStatus('');
                  }}
                  placeholder="nvapi-..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500 transition-colors"
                />
                <button
                  type="button"
                  disabled={nvidiaTesting}
                  onClick={async () => {
                    setNvidiaTesting(true);
                    setNvidiaStatus('Connecting...');
                    const res = await testNvidiaConnection(nvidiaKey);
                    setNvidiaTesting(false);
                    setNvidiaStatus(res.message);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Test NVIDIA NIM Connection"
                >
                  {nvidiaTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" /> : 'Test'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* VOICE (TTS) Section */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Voice & Speech (TTS)</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200">
              Neural Audio
            </span>
          </div>

          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-200">Auto Speak Responses</span>
              <p className="text-xs text-slate-400">Speak AI replies aloud with neural studio voices</p>
            </div>
            <button
              type="button"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                ttsEnabled ? 'bg-white' : 'bg-slate-800'
              }`}
            >
              <div className={`w-5 h-5 rounded-full transition-transform ${
                ttsEnabled ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-slate-400'
              }`} />
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 font-sans transition-colors"
            >
              {Object.entries(VOICE_OPTIONS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => testVoice(selectedVoice)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Test
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-300">Voice Speed</span>
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(e.target.value)}
                className="accent-white w-28 cursor-pointer"
              />
              <span className="text-xs font-mono font-semibold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {voiceSpeed}x
              </span>
            </div>
          </div>
        </div>

        {/* HUMAN COMPANION EXPERIENCE Toggle */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">
              Human Companion Experience
            </div>
            <div className="text-xs text-slate-400">Living presence, acoustic chimes, and conversational pacing</div>
          </div>

          <button
            type="button"
            onClick={() => setHumanCompanion(!humanCompanion)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              humanCompanion ? 'bg-white' : 'bg-slate-800'
            }`}
          >
            <div className={`w-5 h-5 rounded-full transition-transform ${
              humanCompanion ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-slate-400'
            }`} />
          </button>
        </div>

        {/* HEY ULTRON WAKE WORD DETECTION Toggle */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">
              Wake Word Detection ("Hey Ultron")
            </div>
            <div className="text-xs text-slate-400">Activate voice listening hands-free</div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextVal = !wakeWord;
              setWakeWord(nextVal);
              localStorage.setItem('ultron_wake_word', nextVal ? 'true' : 'false');
              window.dispatchEvent(new CustomEvent('ultron-wake-word-toggle', { detail: { enabled: nextVal } }));
            }}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              wakeWord ? 'bg-white' : 'bg-slate-800'
            }`}
          >
            <div className={`w-5 h-5 rounded-full transition-transform ${
              wakeWord ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-slate-400'
            }`} />
          </button>
        </div>

        {/* VOICE INPUT ACCENT & LANGUAGE */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Speech Recognition Language</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200">
              Indian English
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Optimized for Indian English accents, Hinglish, and Hindi recognition.
          </p>
          <select
            value={speechLang}
            onChange={(e) => setSpeechLang(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-500 font-sans transition-colors"
          >
            <option value="en-IN">English (India) — Indian Accents & Hinglish</option>
            <option value="hi-IN">हिन्दी (Hindi - India)</option>
            <option value="en-US">English (United States)</option>
            <option value="en-GB">English (United Kingdom)</option>
          </select>
        </div>

        {/* POSTGRESQL DATABASE & .EXE SYNC CONFIGURATION */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">PostgreSQL & Desktop Sync</span>
            <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
              dbStatus?.connected
                ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40'
                : 'text-slate-300 bg-slate-800 border-slate-700'
            }`}>
              {dbStatus?.engine || 'Detecting...'}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Persists logged-in user credentials and synchronizes chat history between web and the .exe desktop software.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-300">Backend API Host</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                placeholder="http://127.0.0.1:8000 (Default Local Engine)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-slate-500 transition-colors"
              />
              <button
                type="button"
                disabled={dbLoading}
                onClick={handleTestDb}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin text-slate-300' : ''}`} />
                <span>Test DB</span>
              </button>
            </div>
            {dbStatus && (
              <div className="text-[11px] font-mono text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span>Engine: <strong className={dbStatus.connected ? 'text-emerald-400' : 'text-slate-200'}>{dbStatus.engine}</strong></span>
                <span>• Host: <strong className="text-slate-200">{dbStatus.host || 'localhost'}</strong></span>
                <span>• DB: <strong className="text-slate-200">{dbStatus.database || 'ultron_db'}</strong></span>
                <span>• Users: <strong className="text-white">{dbStatus.userCount ?? 0}</strong></span>
                <span>• Chats: <strong className="text-white">{dbStatus.chatCount ?? 0}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
