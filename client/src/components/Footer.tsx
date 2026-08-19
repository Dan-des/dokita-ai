import React from 'react';
import { ActivityIcon, ShieldAlertIcon, PhoneIcon } from './Icons';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Emergency Hotline Banner */}
      <div className="bg-teal-950 border-b border-teal-800/80 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-teal-200 font-medium">
            <ShieldAlertIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Facing an acute emergency? Call dispatch immediately.</span>
          </div>
          <div className="flex items-center gap-4 text-teal-100 font-semibold">
            <span className="flex items-center gap-1.5 bg-teal-900 px-2.5 py-1 rounded-md border border-teal-700">
              <PhoneIcon className="w-3.5 h-3.5 text-teal-300" />
              <span>Emergency Hotlines: 112 / 767</span>
            </span>
            <Link to="/chat" className="underline hover:text-white transition-colors">
              Ask AI for 24/7 Hospitals
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Column 1: Brand & Tagline */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold">
                <ActivityIcon className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Dokita<span className="text-teal-400">AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Evidence-based preliminary clinical triage, conversational hospital discovery, and physician consultation export.
            </p>
          </div>

          {/* Column 2: Clinical Services */}
          <div className="space-y-2 text-xs">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Platform Services</p>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/chat" className="hover:text-teal-400 transition-colors">Launch Triage Chat App</Link></li>
              <li><Link to="/" className="hover:text-teal-400 transition-colors">App Overview & Capabilities</Link></li>
              <li><Link to="/faq" className="hover:text-teal-400 transition-colors">Clinical FAQ & Guidelines</Link></li>
              <li><Link to="/login" className="hover:text-teal-400 transition-colors">Patient Account Login</Link></li>
            </ul>
          </div>

          {/* Column 3: Legal & Compliance */}
          <div className="space-y-2 text-xs">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Compliance & Privacy</p>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/privacy" className="hover:text-teal-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-teal-400 transition-colors">Terms of Service</Link></li>
              <li><a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">Sitemap.xml</a></li>
              <li><a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">Robots.txt</a></li>
            </ul>
          </div>

          {/* Column 4: Statutory Medical Disclaimer */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold uppercase tracking-wider text-[10px]">
              <ShieldAlertIcon className="w-3.5 h-3.5" />
              <span>Statutory Disclaimer</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              DokitaAI is not a substitute for professional clinical diagnosis or emergency care. In case of life-critical illness, call 112 / 767 immediately.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 DokitaAI Health Systems. All rights reserved.</p>
          <p>Triage grounding: WHO, CDC, Mayo Clinic & NHS UK Guidelines.</p>
        </div>
      </div>
    </footer>
  );
};
