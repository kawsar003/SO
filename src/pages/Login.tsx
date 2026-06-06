import React, { useState } from 'react';
import { Mail, ShieldCheck, Key, ArrowRight, Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (email: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/management/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', data.email);
        onLoginSuccess(data.email);
      } else {
        setError(data.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err) {
      setError('Server communication failed. Please verify the backend service is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-screen-outer" className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      {/* Decorative premium dark glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md shrink-0 relative z-10 text-center space-y-3 px-4">
        <div className="inline-flex w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/10 text-white rounded-2xl items-center justify-center text-3xl font-black mx-auto animate-fadeIn select-none border border-blue-400/20">
          SO
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white font-sans sm:text-4xl">
          SmartOffice ERP
        </h2>
        <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
          Manage operations with unified master configuration and staff accounts.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md shrink-0 relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="text-left space-y-1">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Sign In to SmartOffice
              </h3>
              <p className="text-xs text-slate-500 leading-normal">
                Enter your registered corporate email and password assigned by the super administrator.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 flex gap-2.5 text-xs text-rose-400 animate-fadeIn text-left leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="email-input" className="block text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                Corporate Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@company.com"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all font-sans"
                  autoFocus
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="password-input" className="block text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter login password"
                  className="block w-full pl-11 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-550 hover:text-slate-350 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-slate-450" /> : <Eye className="w-4 h-4 text-slate-450" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer h-11 items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin animate-infinite" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
