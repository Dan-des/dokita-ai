import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ActivityIcon, ChatBubbleIcon, ShieldCheckIcon, LogoutIcon, LoginIcon, UserPlusIcon, MenuIcon, CloseIcon, ChevronDownIcon, UserIcon, HelpIcon } from './Icons';

interface HeaderProps {
  onOpenFeedback?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFeedback }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-300 bg-white/95 backdrop-blur-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold">
              <ActivityIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1">
                Dokita<span className="text-teal-700">AI</span>
              </span>
              <span className="text-[9px] text-teal-800 font-semibold tracking-wider uppercase">Telehealth Platform</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive('/') ? 'text-teal-800 bg-teal-50 border border-teal-200' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Overview
            </Link>
            <Link
              to="/chat"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/chat') ? 'text-teal-800 bg-teal-50 border border-teal-200' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ChatBubbleIcon className="w-3.5 h-3.5 text-teal-700" />
              <span>Launch Chat</span>
            </Link>
            <Link
              to="/faq"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/faq') ? 'text-teal-800 bg-teal-50 border border-teal-200' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HelpIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>FAQ</span>
            </Link>
            {onOpenFeedback && (
              <button
                onClick={onOpenFeedback}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Feedback
              </button>
            )}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center space-x-2.5">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <LoginIcon className="w-3.5 h-3.5" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[110px]">
                      {user?.name}
                    </p>
                  </div>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 py-1.5 z-50 shadow-md">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase">Signed in as</p>
                      <p className="text-xs font-bold text-slate-900 truncate">{user?.email}</p>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2 px-3.5 py-2 text-xs text-teal-800 hover:bg-teal-50 font-semibold transition-colors"
                      >
                        <ShieldCheckIcon className="w-4 h-4 text-teal-700" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <Link
                      to="/chat"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <ChatBubbleIcon className="w-4 h-4 text-slate-500" />
                      <span>My Consultations</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 cursor-pointer"
                    >
                      <LogoutIcon className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              {mobileMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 text-xs">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
          >
            Overview
          </Link>
          <Link
            to="/chat"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
          >
            Launch Chat
          </Link>
          <Link
            to="/faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
          >
            FAQ
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg font-semibold text-teal-800 bg-teal-50"
            >
              Admin Console
            </Link>
          )}

          <div className="pt-3 border-t border-slate-200">
            {!isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 bg-teal-700 text-white rounded-lg font-semibold"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-slate-100 rounded-lg">
                  <p className="font-bold text-slate-900">{user?.name}</p>
                  <p className="text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-red-600 bg-red-50 rounded-lg font-semibold cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
