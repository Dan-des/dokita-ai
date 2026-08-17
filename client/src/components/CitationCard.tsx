import React, { useState } from 'react';
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { SourceCitation } from '../types';

interface CitationCardProps {
  sources: SourceCitation[];
}

export const CitationCard: React.FC<CitationCardProps> = ({ sources }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors text-xs font-medium border border-slate-200/60"
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Authoritative Clinical Citations ({sources.length})</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>{isOpen ? 'Hide Sources' : 'View Verified Sources'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1.5 pl-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {sources.map((src, index) => (
            <a
              key={index}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-teal-50 border border-slate-100 hover:border-teal-200 text-xs text-slate-700 hover:text-teal-900 transition-all group"
            >
              <div className="flex items-center gap-2 truncate">
                <BookOpen className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate font-medium">{src.title}</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-teal-600 shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
