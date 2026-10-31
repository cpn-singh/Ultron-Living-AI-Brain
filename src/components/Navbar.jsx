import React, { useState, useEffect } from 'react';
import { Target, Lock, MessageSquare, MoreHorizontal, Menu, Sparkles, Check, User, LogOut } from 'lucide-react';
import { BOTS } from '../data/botsData';

export default function Navbar({ 
  activeAgent, 
  setActiveAgent, 
  activeTab, 
  setActiveTab, 
  onOpenSettings, 
  onOpenAuth,
  onToggleMobileSidebar 
}) {
  const [showBotDropdown, setShowBotDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const activeBotObj = BOTS.find(b => b.id === activeAgent) || BOTS[0];

  useEffect(() => {
    const checkUser = () => {
      const stored = localStorage.getItem('ultron_user');
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch (e) { setUser(null); }
      } else {
        setUser(null);
      }
    };
    checkUser();
    window.addEventListener('storage', checkUser);
    const interval = setInterval(checkUser, 1000);
    return () => {
      window.removeEventListener('storage', checkUser);
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('ultron_user');
    setUser(null);
  };

  return (
    <header className="h-10 pt-[env(safe-area-inset-top)] flex items-center justify-between border-b border-white/5 bg-slate-900/60 backdrop-blur-lg z-50 select-none px-3 sm:px-6">
      {/* Left side logo & bot selector */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00d4ff]" />
          <span className="text-xs font-bold tracking-[0.25em] bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            ULTRON
          </span>
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-cyan-300/90 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded-full font-mono">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            Gemini 3.8 Flash • DeepSeek-R1
          </span>
        </div>

        <div className="w-[1px] h-4 bg-white/10 hidden sm:block" />

        {/* Bot Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBotDropdown(!showBotDropdown)}
            aria-label={`Current bot: ${activeBotObj.name}. Click to switch bot`}
            aria-expanded={showBotDropdown}
            className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 bg-white/[0.04] border border-white/10 text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            title="Switch Active Bot"
          >
            <Target className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
            <span className="font-medium text-[11px] truncate max-w-[110px] sm:max-w-none">
              {activeBotObj.name}
            </span>
            <span className="text-[10px] text-white/40">▾</span>
          </button>

          {showBotDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-slate-950/95 border border-white/15 rounded-2xl p-2 shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-2xl z-50 max-h-80 overflow-y-auto flex flex-col gap-1">
              <div className="px-2 py-1 text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider font-mono border-b border-white/10 mb-1">
                Active 11-Bot Fleet
              </div>
              {BOTS.map((bot) => {
                const isSelected = activeAgent === bot.id;
                return (
                  <button
                    key={bot.id}
                    onClick={() => {
                      setActiveAgent(bot.id);
                      setShowBotDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 font-semibold'
                        : 'text-white/70 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{bot.name}</span>
                      <span className="text-[10px] text-white/40 font-mono">{bot.category}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2" style={{ appRegion: 'no-drag' }}>
        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-1.5">
          {user ? (
            <div className="flex items-center gap-1.5">
              <div className="h-7.5 px-3 rounded-full text-xs flex items-center gap-1.5 text-emerald-300 bg-emerald-950/40 border border-emerald-500/30">
                <User className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold text-[11px] truncate max-w-[120px]">{user.name}</span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign Out"
                className="h-7.5 w-7.5 flex items-center justify-center rounded-full text-rose-400 hover:text-rose-200 bg-white/[0.04] border border-white/10 hover:border-rose-500/40 hover:bg-rose-950/40 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              aria-label="Sign In or Sign Up"
              className="h-7.5 px-3 rounded-full text-xs flex items-center gap-1.5 text-white bg-white/[0.04] border border-white/10 hover:bg-cyan-500/15 hover:border-cyan-400/40 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,212,255,0.1)]"
              title="Sign Up / Login"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="font-semibold text-[11px] tracking-wide">Sign Up / Login</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            aria-label="Open Chat Panel"
            className={`h-7.5 px-3 rounded-full text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeTab === 'chat'
                ? 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.2)] font-semibold'
                : 'text-white/70 hover:text-white bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium text-[11px]">Chat</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="More Advanced Developer Tools"
            className="h-7.5 w-7.5 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-all cursor-pointer border bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/[0.08]"
            title="More Tools / Settings"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Buttons */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={user ? handleSignOut : onOpenAuth}
            aria-label={user ? "Sign Out" : "Sign In or Sign Up"}
            className="h-7.5 px-2.5 rounded-full text-xs flex items-center gap-1 text-white bg-white/[0.04] border border-white/10 active:bg-white/15"
          >
            {user ? <LogOut className="w-3.5 h-3.5 text-rose-400" /> : <Lock className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Open Actions Drawer"
            className="h-7.5 w-7.5 flex items-center justify-center rounded-lg text-white/80 bg-white/[0.04] border border-white/10 active:bg-white/15 transition-all cursor-pointer"
            title="Menu"
          >
            <Menu className="w-4 h-4 text-white/90" />
          </button>
        </div>
      </div>
    </header>
  );
}
