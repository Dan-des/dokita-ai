import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageSquare, Building2, Home } from 'lucide-react';

export const ThankYou: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 mx-auto flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Thank You for Your Feedback
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Your insights directly help our clinical engineering team enhance medical triage precision, multilingual accuracy, and patient safety protocols.
        </p>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 max-w-md mx-auto">
        If you or someone nearby is experiencing acute medical distress, please do not hesitate to contact emergency services at <strong>112 / 767</strong> or visit an emergency care facility.
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/chat"
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Return to Chat Triage</span>
        </Link>
        <Link
          to="/hospitals"
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
        >
          <Building2 className="w-4 h-4" />
          <span>Find Hospitals</span>
        </Link>
        <Link
          to="/"
          className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Main Portal</span>
        </Link>
      </div>
    </div>
  );
};
