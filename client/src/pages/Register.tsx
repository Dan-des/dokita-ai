import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/auth';
import { ActivityIcon, UserPlusIcon, LockIcon, MailIcon, UserIcon, PhoneIcon, AlertCircleIcon, ArrowRightIcon, LoaderIcon, KeyIcon } from '../components/Icons';

export const Register: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);
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

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.trim() || undefined,
        adminKey: adminKey.trim() || undefined,
      });

      if (res.success && res.token && res.user) {
        login(res.token, res.user);
        navigate(redirectTarget, { replace: true, state: initialPrompt ? { initialPrompt } : undefined });
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please check your details and try again.');
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
              <ActivityIcon className="w-5 h-5" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Dokita<span className="text-teal-700">AI</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900">Create your health account</h2>
          <p className="text-xs text-slate-500">
            Instant confidential patient registration
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-300 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Full Name *</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. / Mr. / Ms. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Address *</label>
              <div className="relative">
                <MailIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Phone Number <span className="text-slate-400 font-normal">(Optional for WhatsApp Sync)</span>
              </label>
              <div className="relative">
                <PhoneIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Password (min. 6 characters) *</label>
              <div className="relative">
                <LockIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Confirm Password *</label>
              <div className="relative">
                <LockIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            {/* Optional Admin Key Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdminKey(!showAdminKey)}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                {showAdminKey ? '- Hide Admin Key' : '+ Have an Admin Secret Key?'}
              </button>
              {showAdminKey && (
                <div className="mt-2 space-y-1">
                  <div className="relative">
                    <KeyIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="Optional Admin Access Key"
                      className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-4 h-4" />
                  <span>Register & Enter Chat</span>
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              state={initialPrompt ? { initialPrompt } : undefined}
              className="font-semibold text-teal-700 hover:text-teal-800 underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
