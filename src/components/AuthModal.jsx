import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthenticated }) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'passcode'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateForm = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (tab === 'passcode') {
      if (!passcode || passcode.length < 4) {
        setErrorMsg('Passcode must be at least 4 digits');
        return false;
      }
      return true;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address');
      return false;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return false;
    }

    if (tab === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name');
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const userObj = {
      email: email || 'user@ultron.ai',
      name: tab === 'signup' ? name.trim() : (email ? email.split('@')[0] : 'ULTRON User'),
      mode: tab,
      authenticatedAt: new Date().toISOString()
    };

    localStorage.setItem('ultron_user', JSON.stringify(userObj));
    setSuccessMsg(tab === 'signup' ? 'Account created successfully!' : 'Signed in successfully!');

    setTimeout(() => {
      if (onAuthenticated) onAuthenticated(userObj);
      onClose();
    }, 500);
  };

  const handleGuest = () => {
    const guestUser = {
      email: 'guest@ultron.ai',
      name: 'Guest Explorer',
      mode: 'guest',
      authenticatedAt: new Date().toISOString()
    };
    localStorage.setItem('ultron_user', JSON.stringify(guestUser));
    if (onAuthenticated) onAuthenticated(guestUser);
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl relative border border-cyan-500/30 bg-slate-950/95 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header (No icons) */}
        <div className="border-b border-white/10 pb-4 mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            ULTRON Neural Access <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">Sign in or create an account to persist your AI sessions.</p>
        </div>

        {/* Auth Tabs (No icons/emojis) */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 mb-4">
          <button
            type="button"
            onClick={() => { setTab('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signin' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signup' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setTab('passcode'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'passcode' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Passcode
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* Form (No icons inside inputs) */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          )}

          {tab !== 'passcode' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters..."
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              {tab === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password..."
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Master Passcode</label>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter 6-digit master passcode..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          )}

          {/* Submit button (No icon) */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-lg shadow-cyan-950/40 transition-all mt-2 cursor-pointer"
          >
            {tab === 'signin' ? 'Sign In' : tab === 'signup' ? 'Create Account' : 'Authenticate Passcode'}
          </button>
        </form>

        {/* Guest fallback button (No icon) */}
        <div className="pt-3 border-t border-white/10 mt-3 text-center">
          <button
            type="button"
            onClick={handleGuest}
            className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
          >
            Continue as Guest / Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}
