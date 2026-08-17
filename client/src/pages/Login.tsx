import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/auth';
import { Activity, LogIn, Lock, Mail, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialPrompt = (location.state as any)?.initialPrompt;
  const redirectTarget = (location.state as any)?.from?.pathname || (location.state as any)?.redirectAfter || '/chat';

  // Automatically redirect away if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true, state: initialPrompt ? { initialPrompt } : undefined });
    }
  }, [isAuthenticated, navigate, redirectTarget, initialPrompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await loginUser({ email, password });
      if (res.success && res.token && res.user) {
        login(res.token, res.user);
        navigate(redirectTarget, { replace: true, state: initialPrompt ? { initialPrompt } : undefined });
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid credentials or server error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Dokita<span className="text-teal-700">AI</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900">Sign in to start consultation</h2>
          <p className="text-xs text-slate-500">
            Access confidential, multilingual AI telehealth triage
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-300 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Password</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In & Enter Chat</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              state={initialPrompt ? { initialPrompt } : undefined}
              className="font-semibold text-teal-700 hover:text-teal-800 underline"
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
