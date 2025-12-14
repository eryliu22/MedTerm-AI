import React from 'react';
import { TranslationCategory, TranslationItem } from '../types';

interface OptionCardProps {
  item: TranslationItem;
  rank: number; // 0 is top
  isSelected?: boolean;
  isFaded?: boolean;
  onSelect: () => void;
  onReject: (e: React.MouseEvent) => void;
  disabled: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  item,
  rank,
  isSelected = false,
  isFaded = false,
  onSelect,
  onReject,
  disabled
}) => {
  // Styles based on category
  let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
  if (item.category === TranslationCategory.CLINICAL) badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
  if (item.category === TranslationCategory.LITERAL) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (item.category === TranslationCategory.DESCRIPTIVE) badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
  if (item.category === TranslationCategory.USER) badgeColor = "bg-purple-50 text-purple-700 border-purple-100";

  // Highly Verified Styling (>10 selects)
  const isHighlyVerified = item.selects >= 10;

  // Selection specific overrides
  const containerClasses = isSelected 
    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500 shadow-lg shadow-teal-500/10 scale-[1.02] z-10'
    : isFaded 
      ? 'opacity-50 grayscale border-slate-100 bg-slate-50 hover:opacity-100 hover:scale-[1.02] hover:grayscale-0 hover:shadow-md'
      : isHighlyVerified
        ? 'border-teal-400 bg-gradient-to-br from-teal-50/50 to-white shadow-md ring-1 ring-teal-200 hover:scale-[1.02] hover:shadow-lg'
        : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]';

  return (
    <div 
      onClick={!disabled ? onSelect : undefined}
      style={{ animationDelay: `${rank * 100}ms` }}
      className={`
      animate-card-enter
      relative flex flex-col p-3 md:p-5 rounded-3xl border transition-all duration-300 cursor-pointer min-h-[10rem] md:min-h-[11rem] justify-between
      ${containerClasses}
      ${disabled ? 'pointer-events-none' : ''} 
    `}>
      {/* Absolute Reject Button - Top Right */}
      {!isFaded && !isSelected && (
        <button
          onClick={onReject}
          title="Incorrect translation"
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-transparent hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-colors z-20 group"
        >
          <svg className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* Selected Indicator Checkmark */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-teal-500 text-white rounded-full shadow-md animate-in zoom-in duration-300">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Header / Stats */}
      <div className="flex justify-between items-start mb-2">
         {item.selects > 0 ? (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            <span>{item.selects}</span>
          </div>
        ) : <div />} 
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col justify-start">
        <h3 className={`text-lg md:text-xl font-bold leading-tight mb-2 break-words hyphens-auto transition-colors duration-300 ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>
            {item.term}
        </h3>
        <p className={`text-[11px] md:text-xs font-medium leading-relaxed line-clamp-4 transition-colors duration-300 ${isSelected ? 'text-teal-700' : 'text-slate-500'}`}>
            {item.context}
        </p>
      </div>

      {/* Category Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100/50 flex justify-start">
        <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md shadow-sm ${badgeColor}`}>
          {item.category.split('/')[0]} 
        </span>
      </div>
    </div>
  );
};