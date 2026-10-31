import React, { useState } from 'react';
import { X, Key, Cpu, Mic, Shield, Sliders, CheckCircle2, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { VOICE_OPTIONS, testVoice } from '../services/voiceTtsService';
import { testNvidiaConnection, testGeminiConnection } from '../services/aiService';

export default function SettingsModal({ onClose }) {
  const [activeModel, setActiveModel] = useState(() => localStorage.getItem('ultron_ai_model') || 'nvidia-nemotron');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('ultron_gemini_key') || 'AQ.Ab8RN6JbJoqII58fggQw7qe7dzbtTY4Yabqr-UZNeteyxmV0CA');
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState('');
  const [nvidiaKey, setNvidiaKey] = useState(() => localStorage.getItem('ultron_nvidia_key') || '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');
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('ultron_tts_voice') || 'af_heart');
  const [voiceSpeed, setVoiceSpeed] = useState(() => localStorage.getItem('ultron_voice_speed') || '1.0');
  const [humanCompanion, setHumanCompanion] = useState(() => localStorage.getItem('ultron_human_companion') !== 'false');
  const [statusMsg, setStatusMsg] = useState('');
  const [nvidiaTesting, setNvidiaTesting] = useState(false);
  const [nvidiaStatus, setNvidiaStatus] = useState('');

  const handleSave = () => {
    localStorage.setItem('ultron_ai_model', activeModel);
    localStorage.setItem('ultron_gemini_key', geminiKey);
    localStorage.setItem('ultron_nvidia_key', nvidiaKey);
    localStorage.setItem('ultron_tts_voice', selectedVoice);
    localStorage.setItem('ultron_voice_speed', voiceSpeed);
    localStorage.setItem('ultron_human_companion', humanCompanion ? 'true' : 'false');
    setStatusMsg('Settings saved successfully!');
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pt-14 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl relative flex flex-col gap-4 border border-rose-900/60 max-h-[90vh] overflow-y-auto bg-zinc-950/95 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-900/40"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 border-b border-rose-900/40 pb-3">
          <Sliders className="w-5 h-5 text-rose-500 animate-pulse" />
          <div>
            <h2 className="text-lg font-bold text-rose-300">ULTRON Swarm Core Settings</h2>
            <p className="text-xs text-rose-300/60">Configure inference engines, speech synthesis, & companion mode.</p>
          </div>
        </div>

        {statusMsg && (
          <div className="p-2.5 bg-green-950/40 border border-green-800/40 rounded-xl text-xs text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {statusMsg}
          </div>
        )}

        {/* ONLINE AI Section */}
        <div className="p-3 bg-black/60 border border-rose-950 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400">
            <span>ONLINE AI ENGINES & FRONTIER MODELS</span>
            <span className="text-[10px] text-green-400 bg-green-950/40 px-2 py-0.5 rounded border border-green-800/40">Active 2026 Fleet</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-cyan-300 font-mono">PRIMARY AI INFERENCE ENGINE</label>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-black/90 border border-cyan-900/60 rounded-xl px-3 py-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (High-Speed & Reasoning)</option>
                <option value="gemini-3.6-flash">Google Gemini 3.6 Flash (Stable Multimodal)</option>
                <option value="deepseek-r1">DeepSeek-R1 via NVIDIA NIM (Deep Reasoning & Math)</option>
                <option value="llama-3.3-70b">Meta LLaMA 3.3 70B (Open Weights Frontier)</option>
                <option value="nvidia-nemotron">NVIDIA Nemotron-70B (Swarm Coordinator)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-cyan-300 font-mono">GOOGLE GEMINI API KEY (PRIMARY)</label>
                {geminiStatus && (
                  <span className={`text-[10px] font-mono ${geminiStatus.includes('Connected') ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                  placeholder="Gemini API Key (AIzaSy...)"
                  className="flex-1 bg-black/80 border border-cyan-900/60 rounded-xl px-3 py-2 text-xs text-cyan-100 font-mono focus:outline-none focus:border-cyan-500"
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
                  className="px-3 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Test Gemini API Connection"
                >
                  {geminiTesting ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                  ) : (
                    <span>Test</span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-rose-300 font-mono">NVIDIA NIM API KEY (FALLBACK / DEEPSEEK)</label>
                {nvidiaStatus && (
                  <span className={`text-[10px] font-mono ${nvidiaStatus.includes('Connected') ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                  placeholder="NVIDIA NIM API Key (nvapi-...)"
                  className="flex-1 bg-black/80 border border-rose-900/60 rounded-xl px-3 py-2 text-xs text-rose-100 font-mono focus:outline-none focus:border-rose-500"
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
                  className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Test NVIDIA NIM Connection"
                >
                  {nvidiaTesting ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                  ) : (
                    <span>Test</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* VOICE (TTS) Section */}
        <div className="p-3 bg-black/60 border border-rose-950 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400">
            <span className="flex items-center gap-1.5"><Mic className="w-4 h-4 text-rose-500" /> VOICE (TTS)</span>
            <span className="text-[10px] text-yellow-400 font-mono">Native Speech Engine</span>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="flex-1 bg-black/90 border border-rose-900/60 rounded-xl px-3 py-2 text-xs text-rose-100 focus:outline-none focus:border-rose-500 font-sans"
            >
              {Object.entries(VOICE_OPTIONS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => testVoice(selectedVoice)}
              className="px-3 py-2 rounded-xl text-xs text-rose-200 bg-rose-900/50 hover:bg-rose-800/50 border border-rose-700/50 flex items-center gap-1.5 transition-all"
            >
              <Volume2 className="w-4 h-4 text-rose-400" /> Test
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-rose-300/70">Voice Speed</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(e.target.value)}
                className="accent-rose-500 w-28"
              />
              <span className="text-xs font-mono text-rose-300">{voiceSpeed}x</span>
            </div>
          </div>
        </div>

        {/* HUMAN COMPANION EXPERIENCE Toggle */}
        <div className="p-3 bg-black/60 border border-rose-950 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> HUMAN COMPANION EXPERIENCE
            </div>
            <div className="text-[10px] text-rose-300/50">Living presence, acoustic felt chimes & conversational voice</div>
          </div>

          <button
            type="button"
            onClick={() => setHumanCompanion(!humanCompanion)}
            className={`w-11 h-6 rounded-full p-1 transition-all duration-300 ${
              humanCompanion ? 'bg-emerald-500' : 'bg-zinc-800'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              humanCompanion ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="cyber-button px-4 py-2 rounded-xl text-xs text-rose-100 font-bold"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
