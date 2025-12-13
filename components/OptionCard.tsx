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
    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500 shadow-md scale-[1.02] z-10'
    : isFaded 
      ? 'opacity-40 grayscale border-slate-100 bg-slate-50 hover:opacity-80 hover:scale-[1.01] hover:grayscale-0' // Added hover states for faded
      : isHighlyVerified
        ? 'border-teal-400 bg-gradient-to-br from-teal-50/50 to-white shadow-sm ring-1 ring-teal-200'
        : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-md active:scale-95';

  return (
    <div 
      onClick={!disabled ? onSelect : undefined}
      className={`
      relative flex flex-col p-3 md:p-6 rounded-3xl border transition-all duration-300 cursor-pointer min-h-[10rem] md:min-h-[12rem]
      ${containerClasses}
      ${disabled ? 'pointer-events-none' : ''} 
    `}>
      {/* Absolute Reject Button - Top Right - Hide if faded or selected to clean up UI */}
      {!isFaded && !isSelected && (
        <button
          onClick={onReject}
          title="Incorrect translation"
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-white/80 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-colors z-10"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* Selected Indicator Checkmark */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-teal-500 text-white rounded-full">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Stats - Top Left */}
      <div className="flex items-center gap-1 mb-1">
         {item.selects > 0 && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isSelected ? 'text-teal-800' : 'text-teal-600'}`}>
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            <span>{item.selects}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col justify-center">
        <h3 className={`text-lg md:text-2xl font-extrabold leading-[1.1] mb-2 break-words hyphens-auto ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>
            {item.term}
        </h3>
        <p className={`text-[11px] md:text-sm font-medium leading-snug line-clamp-4 md:line-clamp-none ${isSelected ? 'text-teal-700' : 'text-slate-500'}`}>
            {item.context}
        </p>
      </div>

      {/* Category Footer - Bottom */}
      <div className={`mt-3 pt-2 border-t ${isSelected ? 'border-teal-200' : 'border-slate-100'}`}>
        <span className={`text-[9px] md:text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md ${badgeColor}`}>
          {item.category.split('/')[0]} 
        </span>
      </div>
    </div>
  );
};