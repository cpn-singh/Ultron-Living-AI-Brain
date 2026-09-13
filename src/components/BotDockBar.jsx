import React from 'react';
import { TrendingUp, Code2, Layers, MessageSquare, Sparkles, ExternalLink } from 'lucide-react';

export default function BotDockBar({ activeTab, setActiveTab, onLaunchTradeSwarm, onLaunchCodeSwarm }) {
  return (
    <div className="fixed bottom-7 inset-x-0 z-30 flex flex-col items-center gap-2.5 pointer-events-none px-4 select-none">
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-full bg-[#02040a]/85 backdrop-blur-[12px] border border-[rgba(0,240,255,0.18)] shadow-[0_12px_48px_rgba(0,0,0,0.95),0_0_30px_rgba(0,240,255,0.15)]">
        {/* TRADE Swarm Trigger Button */}
        <button
          type="button"
          onClick={() => {
            if (onLaunchTradeSwarm) onLaunchTradeSwarm();
            else setActiveTab('swarm');
          }}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer transition-all active:scale-95"
          title="Launch Trade Swarm (10 Quant Agents)"
          aria-label="TRADE Swarm"
        >
          <TrendingUp className="w-4 h-4 fill-slate-950" />
          <span>TRADE</span>
        </button>

        {/* Google Colab Redirect Button */}
        <a
          href="https://colab.research.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.55)] cursor-pointer transition-all active:scale-95 no-underline"
          title="Open Google Colab Notebooks"
          aria-label="Google Colab"
        >
          <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>COLAB</span>
        </a>

        {/* CODE Swarm Trigger Button */}
        <button
          type="button"
          onClick={() => {
            if (onLaunchCodeSwarm) onLaunchCodeSwarm();
            else setActiveTab('swarm');
          }}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer transition-all active:scale-95"
          title="Launch Code Swarm (11 Bots)"
          aria-label="CODE Swarm"
        >
          <Code2 className="w-4 h-4" />
          <span>CODE</span>
        </button>

        <div className="w-[1px] h-6 bg-white/15 mx-0.5" />

        {/* Swarm Cards Dashboard Trigger Button */}
        <button
          type="button"
          onClick={() => setActiveTab('swarm')}
          className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
            activeTab === 'swarm'
              ? 'text-white bg-purple-600/30 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
          }`}
          title="Open Dual Swarm Dashboard Cards"
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Swarm Cards</span>
        </button>

        {/* Chat Drawer Trigger Button */}
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
            activeTab === 'chat'
              ? 'text-white bg-cyan-600/30 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
          }`}
          title="Ask ULTRON Anything"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Chat</span>
        </button>
      </div>
    </div>
  );
}
