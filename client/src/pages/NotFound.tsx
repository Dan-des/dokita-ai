import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Home, MessageSquare, Building2, PhoneCall } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-6 bg-white p-8 rounded-2xl border border-slate-300">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
          <Stethoscope className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Error 404</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Clinical Page Not Found</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            The requested medical resource, consultation session, or hospital directory link is unavailable.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs font-semibold">
          <Link
            to="/"
            className="px-4 py-2.5 text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Main Portal</span>
          </Link>
          <Link
            to="/chat"
            className="px-4 py-2.5 text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Start Triage</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Need Emergency Help?</span>
          <a href="tel:112" className="text-red-700 font-bold hover:underline flex items-center gap-1">
            <PhoneCall className="w-3 h-3" />
            <span>Call 112 / 767</span>
          </a>
        </div>
      </div>
    </div>
  );
};
