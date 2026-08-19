import React from 'react';
import { PlusIcon } from './Icons';

interface SymptomChipProps {
  label: string;
  onClick: (symptom: string) => void;
  disabled?: boolean;
}

export const SymptomChip: React.FC<SymptomChipProps> = ({
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(label)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100/90 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200/80 hover:border-teal-300 transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95 active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
    >
      <span>{label}</span>
      <PlusIcon className="w-3 h-3 text-slate-400 group-hover:text-teal-600 ml-0.5" />
    </button>
  );
};
