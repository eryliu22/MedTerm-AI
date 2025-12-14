import React from 'react';

interface HeaderProps {
  contributionCount: number;
}

export const Header: React.FC<HeaderProps> = ({ contributionCount }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 transition-transform hover:scale-105 duration-300 origin-left cursor-default">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.761 2.156 18 5.002 18h9.996c2.846 0 4.185-3.239 2.295-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.188a4 4 0 00-2.122-.054l1.02-1.02a3 3 0 00.879-2.12z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight leading-none">MedTerm AI</h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">Crowdsourced Medical Translation</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-white/50 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {contributionCount} Verified Terms
          </span>
        </div>
      </div>
    </header>
  );
};