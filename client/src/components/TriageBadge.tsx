import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Home } from 'lucide-react';
import { TriageUrgency } from '../types';

interface TriageBadgeProps {
  urgency?: TriageUrgency | string;
  size?: 'sm' | 'md' | 'lg';
}

export const TriageBadge: React.FC<TriageBadgeProps> = ({ urgency = 'ROUTINE', size = 'md' }) => {
  const norm = urgency.toUpperCase();

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  switch (norm) {
    case 'EMERGENCY':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-red-100 text-red-800 border border-red-200 font-bold tracking-wide ${sizeClasses[size]}`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>Emergency (Seek Immediate Care: 112 / 767)</span>
        </span>
      );
    case 'URGENT':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold ${sizeClasses[size]}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Urgent (Physician Evaluation in 12-24 Hours)</span>
        </span>
      );
    case 'SELF_CARE':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold ${sizeClasses[size]}`}
        >
          <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Self-Care / Home Monitoring</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-teal-100 text-teal-800 border border-teal-200 font-medium ${sizeClasses[size]}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>Routine Medical Guidance</span>
        </span>
      );
  }
};
