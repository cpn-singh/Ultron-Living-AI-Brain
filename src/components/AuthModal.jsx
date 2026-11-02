import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { signIn, signUp, signInPasscode } from '../services/authService';
import { fetchUserChatHistory } from '../services/chatHistoryService';

export default function AuthModal({ isOpen, onClose, onAuthenticated }) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'passcode'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (tab === 'passcode') {
      if (!passcode || passcode.length < 4) {
        setErrorMsg('Passcode must be at least 4 digits.');
        return false;
      }
      return true;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return false;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return false;
    }

    if (tab === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm() || loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      let result;
      if (tab === 'signup') {
        result = await signUp({
          name: name.trim(),
          email: email.trim(),
          password,
          passcode: passcode.trim() || undefined
        });
      } else if (tab === 'signin') {
        result = await signIn({
          email: email.trim(),
          password
        });
      } else {
        result = await signInPasscode(passcode.trim());
      }

      if (result.success && result.user) {
        try {
          const remoteHistory = await fetchUserChatHistory(result.user);
          if (Array.isArray(remoteHistory) && remoteHistory.length > 0) {
            localStorage.setItem('ultron_chat_history', JSON.stringify(remoteHistory));
            window.dispatchEvent(new CustomEvent('ultron-history-synced', { detail: { messages: remoteHistory } }));
          }
        } catch (hErr) {
          console.warn('[AuthModal] Chat history sync notice:', hErr);
        }

        if (onAuthenticated) onAuthenticated(result.user);
        onClose();
      } else {
        setErrorMsg(result.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-[380px] p-8 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl relative flex flex-col gap-6">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Ultron
          </h1>
          <p className="text-xs text-slate-400">
            {tab === 'signin' && 'Sign in to your account.'}
            {tab === 'signup' && 'Create your account to continue.'}
            {tab === 'passcode' && 'Enter your operator passcode.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => { setTab('signin'); setErrorMsg(''); }}
            className={`py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              tab === 'signin'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setErrorMsg(''); }}
            className={`py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              tab === 'signup'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => { setTab('passcode'); setErrorMsg(''); }}
            className={`py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              tab === 'passcode'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Passcode
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
              />
            </div>
          )}

          {tab !== 'passcode' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
                />
              </div>

              {tab === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">
                Master passcode
              </label>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors font-mono tracking-widest"
              />
              <span className="text-[11px] text-slate-500">
                Default passcode: 1234
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-lg text-xs font-medium text-slate-950 bg-white hover:bg-slate-200 active:bg-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : tab === 'signin' ? 'Sign in' : tab === 'signup' ? 'Create account' : 'Unlock'}
          </button>
        </form>

      </div>
    </div>
  );
}
