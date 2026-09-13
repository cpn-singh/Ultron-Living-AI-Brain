import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Lock, Key, ArrowRight, UserCheck } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthenticated }) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'passcode'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const userObj = {
      email: email || 'guest@nemio.in',
      name: email ? email.split('@')[0] : 'Guest Explorer',
      mode: tab
    };
    localStorage.setItem('ultron_user', JSON.stringify(userObj));
    if (onAuthenticated) onAuthenticated(userObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl relative border border-emerald-500/30 bg-zinc-950/95 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-950/40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-rose-900/40 pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-rose-100 flex items-center gap-1.5">
              NEMI Neural Access <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-xs text-rose-300/60">Sign in to access your AI companion & persist sessions.</p>
          </div>
        </div>

        {/* Auth Tabs */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-rose-950 mb-4">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signin' ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50' : 'text-rose-400/50 hover:text-rose-200'
            }`}
          >
            🔑 Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signup' ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50' : 'text-rose-400/50 hover:text-rose-200'
            }`}
          >
            ✨ Sign Up
          </button>
          <button
            onClick={() => setTab('passcode')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'passcode' ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50' : 'text-rose-400/50 hover:text-rose-200'
            }`}
          >
            🔐 Passcode
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab !== 'passcode' ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-rose-300/70">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-rose-400/50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-rose-300/70">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-rose-400/50" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password..."
                    className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-rose-300/70">Master Passcode</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-rose-400/50" />
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter 6-digit master passcode..."
                  className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <UserCheck className="w-4 h-4" /> {tab === 'signin' ? 'Sign In' : tab === 'signup' ? 'Create Account' : 'Authenticate Passcode'}
          </button>
        </form>

        {/* Guest fallback button (Matches Screenshot 3) */}
        <div className="pt-3 border-t border-rose-900/30 mt-3 text-center">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-2 rounded-xl text-xs text-rose-300/70 hover:text-rose-100 bg-black/40 hover:bg-rose-950/40 border border-rose-950 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Continue as Guest / Demo Mode</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
