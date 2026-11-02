import React, { useState, useEffect } from 'react';
import { Check, LogOut, MoreHorizontal, Menu } from 'lucide-react';
import { BOTS } from '../data/botsData';
import { signOut } from '../services/authService';

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
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email && parsed.mode !== 'guest') {
            setUser(parsed);
            return;
          }
        } catch (e) {}
      }
      setUser(null);
    };
    checkUser();
    window.addEventListener('storage', checkUser);
    window.addEventListener('ultron-auth-change', checkUser);
    const interval = setInterval(checkUser, 1000);
    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('ultron-auth-change', checkUser);
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = () => {
    signOut();
    setUser(null);
  };

  return (
    <header className="h-11 pt-[env(safe-area-inset-top)] flex items-center justify-between border-b border-white/10 bg-slate-950/90 backdrop-blur-2xl z-50 select-none px-3 sm:px-6">
      {/* Left side logo & bot selector */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-white">
            Ultron
          </span>
          {/* Highlighted text in square box */}
          <span className="hidden lg:inline-flex items-center text-xs font-mono font-semibold text-slate-100 bg-slate-800 border border-slate-600 px-2.5 py-0.5 rounded-md shadow-sm">
            Gemini 3.8 Flash • DeepSeek-R1
          </span>
        </div>

        <div className="w-[1px] h-4 bg-white/10 hidden sm:block" />

        {/* Bot Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBotDropdown(!showBotDropdown)}
            aria-label={`Current model: ${activeBotObj.name}. Click to switch`}
            aria-expanded={showBotDropdown}
            className="px-2.5 py-1 rounded-md text-xs flex items-center gap-2 bg-slate-800 border border-slate-600 text-white hover:bg-slate-750 hover:border-slate-500 transition-colors cursor-pointer shadow-sm"
            title="Switch Active Model"
          >
            <span className="font-semibold text-xs truncate max-w-[120px] sm:max-w-none text-white">
              {activeBotObj.name}
            </span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>

          {showBotDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-slate-900/95 border border-white/10 rounded-xl p-1.5 shadow-2xl backdrop-blur-2xl z-50 max-h-80 overflow-y-auto flex flex-col gap-1">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 font-mono border-b border-white/10 mb-1">
                Specialist Models
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
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-600 shadow-sm font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border-transparent'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">{bot.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{bot.category}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
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
              {/* Highlighted username square box */}
              <div className="h-7 px-2.5 rounded-md text-xs flex items-center gap-1.5 text-white bg-slate-800 border border-slate-600 font-semibold shadow-sm">
                <span className="text-xs font-semibold truncate max-w-[120px] text-white">{user.name}</span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign Out"
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="h-7 px-3 rounded-md text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 transition-colors cursor-pointer shadow-sm"
              title="Sign In"
            >
              Sign In
            </button>
          )}

          {/* Highlighted Chat square box button */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
            aria-label="Toggle Chat Panel"
            className={`h-7 px-3 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
              activeTab === 'chat'
                ? 'text-white bg-slate-800 border-slate-500 font-bold shadow-sm'
                : 'text-slate-200 hover:text-white bg-slate-900 border-slate-700 hover:bg-slate-800 font-semibold'
            }`}
          >
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer border bg-slate-900 border-slate-700 hover:bg-slate-800"
            title="Settings"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Buttons */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={user ? handleSignOut : onOpenAuth}
            aria-label={user ? "Sign Out" : "Sign In"}
            className="h-7 px-2.5 rounded-md text-xs flex items-center gap-1 text-white bg-slate-800 border border-slate-600 font-semibold"
          >
            {user ? <LogOut className="w-3.5 h-3.5" /> : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Open Models Drawer"
            className="h-7 w-7 flex items-center justify-center rounded-md text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Menu"
          >
            <Menu className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
