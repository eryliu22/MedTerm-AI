import React from 'react';

interface HeaderProps {
  contributionCount: number;
}

export const Header: React.FC<HeaderProps> = ({ contributionCount }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.761 2.156 18 5.002 18h9.996c2.846 0 4.185-3.239 2.295-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.188a4 4 0 00-2.122-.054l1.02-1.02a3 3 0 00.879-2.12z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">MedTerm AI</h1>
            <p className="text-xs text-slate-500 font-medium">Crowdsourced Medical Translation</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-600">
            {contributionCount} Verified Terms
          </span>
        </div>
      </div>
    </header>
  );
};