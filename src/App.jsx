import React, { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import BrainCanvas from './components/BrainCanvas';
import ChatDrawer from './components/ChatDrawer';
import AgentSelector from './components/AgentSelector';
import SwarmPanel from './components/SwarmPanel';
import MemoryPanel from './components/MemoryPanel';
import KnowledgeBasePanel from './components/KnowledgeBasePanel';
import SettingsModal from './components/SettingsModal';
import FileManagerPanel from './components/FileManagerPanel';
import VoiceOverlay from './components/VoiceOverlay';
import AuthModal from './components/AuthModal';
import BotDockBar from './components/BotDockBar';
import BenchmarkPanel from './components/BenchmarkPanel';
import MusicPlayer from './components/MusicPlayer';
import { stopSpeech } from './services/voiceTtsService';
import { 
  ZoomIn, ZoomOut, RotateCcw, Compass, ChevronRight, ChevronLeft, X 
} from 'lucide-react';

export default function App() {
  const [activeAgent, setActiveAgent] = useState('orchestrator');
  const [activeTab, setActiveTab] = useState(null);
  const [swarmPreset, setSwarmPreset] = useState(null); // 'trade' | 'code' | null
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [speechTriggerText, setSpeechTriggerText] = useState(null);

  React.useEffect(() => {
    const handleToggle = () => setSidebarOpen(prev => !prev);
    window.addEventListener('toggle-fleet-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-fleet-sidebar', handleToggle);
  }, []);

  const handleTabSwitch = useCallback((tab) => {
    if (tab !== 'chat') {
      setSpeechTriggerText(null);
      stopSpeech();
    }
    setActiveTab(tab);
  }, []);

  const handleSpeechResult = useCallback((text) => {
    if (text && text.trim()) {
      setSpeechTriggerText({ text: text.trim(), ts: Date.now() });
      setActiveTab('chat');
    }
  }, []);

  const handleClearSpeechTrigger = useCallback(() => {
    setSpeechTriggerText(null);
  }, []);

  const handleZoomIn = () => {
    window.dispatchEvent(new CustomEvent('brain-zoom-in'));
  };

  const handleZoomOut = () => {
    window.dispatchEvent(new CustomEvent('brain-zoom-out'));
  };

  const handleResetView = () => {
    window.dispatchEvent(new CustomEvent('brain-reset-view'));
  };

  const handleLaunchCodeSwarm = () => {
    setSwarmPreset('code');
    setActiveTab('swarm');
  };

  return (
    <div className="relative w-screen h-[100dvh] min-h-screen overflow-hidden bg-slate-950 flex flex-col select-none font-sans text-slate-100">
      {/* 3D Cybernetic ULTRON Brain Canvas Background */}
      <div className="fixed inset-0 pointer-events-auto z-0">
        <div className="brain-canvas pointer-events-auto w-full h-full">
          <BrainCanvas activeAgent={activeAgent} activeTab={activeTab} />
        </div>
      </div>

      {/* Floating 3D Brain Navigation Controls Toolbar (Bottom Left) */}
      <div
        className={`fixed bottom-24 sm:bottom-6 left-4 sm:left-6 z-30 pointer-events-auto items-center gap-1.5 p-1.5 rounded-2xl glass-panel bg-slate-950/85 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.75)] select-none ${
          activeTab === 'chat' ? 'hidden sm:flex' : 'flex'
        }`}
        role="toolbar"
        aria-label="3D Brain Navigation Controls"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in on ULTRON Brain"
          className="p-2 min-h-[36px] min-w-[36px] rounded-xl text-white/60 hover:text-cyan-300 hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          title="Zoom In (Scroll up, pinch, or click)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out of ULTRON Brain"
          className="p-2 min-h-[36px] min-w-[36px] rounded-xl text-white/60 hover:text-cyan-300 hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          title="Zoom Out (Scroll down, pinch, or click)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-0.5" aria-hidden="true" />

        <button
          type="button"
          onClick={handleResetView}
          aria-label="Reset Brain Camera View"
          className="p-2 min-h-[36px] min-w-[36px] rounded-xl text-white/60 hover:text-purple-300 hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
          title="Reset 3D View (Default perspective)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true" />

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/40">
          <Compass className="w-3.5 h-3.5 text-purple-400/70" />
          <span>Drag to orbit • Scroll to zoom</span>
        </div>
      </div>

      {/* Left Edge Slide Drawer Toggle Handle */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle 11-Bot Fleet Sidebar"
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 w-5 h-20 flex items-center justify-center bg-white/5 border-r border-white/10 rounded-r-xl text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-md"
        title={sidebarOpen ? 'Close Fleet Sidebar' : 'Open 11-Bot Fleet Sidebar'}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
        )}
      </button>

      {/* Top Header Navigation */}
      <Navbar 
        activeAgent={activeAgent} 
        setActiveAgent={setActiveAgent}
        activeTab={activeTab} 
        setActiveTab={handleTabSwitch} 
        onOpenSettings={() => setShowSettings(true)}
        onOpenAuth={() => setShowAuth(true)}
        onToggleMobileSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Slide-out 11-Bot Fleet Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex pointer-events-auto">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-80 max-w-[85vw] h-full p-4 pt-14 flex flex-col gap-4 border-r border-white/10 bg-slate-950/95 backdrop-blur-2xl z-10 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                11-Bot Fleet Selector
              </span>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AgentSelector 
              activeAgent={activeAgent} 
              setActiveAgent={(id) => {
                setActiveAgent(id);
                setSidebarOpen(false);
              }} 
            />
          </aside>
        </div>
      )}

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex overflow-hidden pt-3 sm:pt-4 p-2 sm:p-4 gap-4 pointer-events-none">
        {/* Modal Floating Panels for Swarm / Memory / RAG / Files / Benchmark Tabs */}
        {activeTab && activeTab !== 'chat' && (
          <section className="flex-1 h-full max-w-4xl mx-auto overflow-hidden pointer-events-auto z-20">
            {activeTab === 'swarm' && (
              <SwarmPanel activeAgent={activeAgent} preset={swarmPreset} onClose={() => setActiveTab(null)} />
            )}
            {activeTab === 'memory' && <MemoryPanel />}
            {activeTab === 'knowledge' && <KnowledgeBasePanel />}
            {activeTab === 'files' && <FileManagerPanel />}
            {activeTab === 'benchmark' && (
              <BenchmarkPanel 
                isOpen={true} 
                onClose={() => setActiveTab('chat')} 
              />
            )}
          </section>
        )}
      </main>

      {/* Floating Right-Docked Chat Drawer */}
      {activeTab === 'chat' && (
        <ChatDrawer 
          activeAgent={activeAgent} 
          setActiveAgent={setActiveAgent}
          onSwitchTab={handleTabSwitch} 
          speechTriggerText={speechTriggerText} 
          onClearSpeechTrigger={handleClearSpeechTrigger}
        />
      )}

      {/* Central Floating Dock Bar */}
      <BotDockBar 
        activeTab={activeTab}
        setActiveTab={handleTabSwitch} 
        onLaunchCodeSwarm={handleLaunchCodeSwarm}
      />

      {/* Floating Microphone Action Button & Equalizer Overlay */}
      <VoiceOverlay activeTab={activeTab} onSpeechResult={handleSpeechResult} />

      {/* Global Interactive Music Player */}
      <MusicPlayer />

      {/* Settings & Auth Modals */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showAuth && (
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}
