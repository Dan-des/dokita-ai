import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, PhoneCall } from 'lucide-react';
import { FAQSection } from '../components/FAQSection';

export const FAQ: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Main Portal</span>
      </Link>

      <FAQSection />

      {/* Quick Action Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm sm:text-base font-bold">Have an urgent symptom to evaluate?</h3>
          <p className="text-xs text-slate-400">
            Start a confidential consultation or find nearby verified emergency centers.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/chat"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Start Triage</span>
          </Link>
          <a
            href="tel:112"
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency 112</span>
          </a>
        </div>
      </div>
    </div>
  );
};
