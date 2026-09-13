import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Lock, Key, ArrowRight, UserCheck, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthenticated }) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'passcode'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
    }, 600);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pt-14 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl relative border border-emerald-500/40 bg-zinc-950/95 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-950/40 transition-colors"
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
              ULTRON Neural Access <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-xs text-rose-300/60">Sign in or create account to persist your AI sessions.</p>
          </div>
        </div>

        {/* Auth Tabs */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-rose-950 mb-4">
          <button
            onClick={() => { setTab('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signin' ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-500/50 shadow-md' : 'text-rose-400/50 hover:text-rose-200'
            }`}
          >
            🔑 Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signup' ? 'bg-cyan-600/40 text-cyan-200 border border-cyan-500/50 shadow-md' : 'text-rose-400/50 hover:text-rose-200'
            }`}
          >
            ✨ Sign Up
          </button>
          <button
            onClick={() => { setTab('passcode'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'passcode' ? 'bg-purple-600/40 text-purple-200 border border-purple-500/50 shadow-md' : 'text-rose-400/50 hover:text-rose-200'
            }`}
          >
            🔐 Passcode
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-950/80 border border-red-800/60 text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === 'signup' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-rose-300/70">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-rose-400/50" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

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
                    className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-cyan-500"
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
                    placeholder="Min 6 characters..."
                    className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {tab === 'signup' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-rose-300/70 font-sans">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-rose-400/50" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password..."
                      className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
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
                  className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" /> {tab === 'signin' ? 'Sign In' : tab === 'signup' ? 'Create Account' : 'Authenticate Passcode'}
          </button>
        </form>

        {/* Guest fallback button */}
        <div className="pt-3 border-t border-rose-900/30 mt-3 text-center">
          <button
            type="button"
            onClick={handleGuest}
            className="w-full py-2 rounded-xl text-xs text-rose-300/70 hover:text-rose-100 bg-black/40 hover:bg-rose-950/40 border border-rose-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Continue as Guest / Demo Mode</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
