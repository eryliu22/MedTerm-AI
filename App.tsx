import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OptionCard } from './components/OptionCard';
import { fetchMedicalTranslation } from './services/geminiService';
import { 
  recordInteraction, 
  changeVote,
  removeVote,
  mergeAndRankResults, 
  addUserSuggestion,
  getRecentActivity,
  getTotalContributions 
} from './services/storageService';
import { TranslationItem, RecentActivityItem } from './types';

// Helper for language detection
const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

function App() {
  const [inputTerm, setInputTerm] = useState('');
  const [currentSearch, setCurrentSearch] = useState('');
  const [correction, setCorrection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // The dynamic list of cards
  const [options, setOptions] = useState<TranslationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // User Suggestion Input
  const [showSuggestInput, setShowSuggestInput] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [hasSuggested, setHasSuggested] = useState(false); 

  // Stats
  const [globalCount, setGlobalCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    setGlobalCount(getTotalContributions());
    setRecentActivity(getRecentActivity());
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTerm.trim()) return;

    setLoading(true);
    setError(null);
    setCorrection(null);
    setOptions([]);
    setSelectedId(null);
    setShowSuggestInput(false);
    setHasSuggested(false);
    setSuggestionError(null);
    
    const searchTerm = inputTerm.trim();

    // 1. Get AI Results
    let aiData = null;
    try {
      aiData = await fetchMedicalTranslation(searchTerm);
    } catch (err) {
      console.error(err);
    }

    // 2. Handle Correction
    let termToRank = searchTerm;
    if (aiData?.correction) {
      setCorrection(aiData.correction);
      termToRank = aiData.correction;
    }

    // 3. Merge and Rank
    const rankedOptions = mergeAndRankResults(termToRank, aiData);
    
    if (rankedOptions.length === 0 && !aiData) {
      setError("No translations found and no history available.");
    } else {
      setOptions(rankedOptions);
      setCurrentSearch(termToRank);
    }
    
    setLoading(false);
  };

  const handleSelect = (item: TranslationItem) => {
    // Unselect
    if (selectedId === item.id) {
      removeVote(currentSearch, item.term);
      setOptions(prev => prev.map(o => 
        o.id === item.id ? { ...o, selects: Math.max(0, o.selects - 1) } : o
      ));
      setSelectedId(null);
      setGlobalCount(prev => Math.max(0, prev - 1));
      return;
    }

    // Switch
    if (selectedId) {
      const oldItem = options.find(o => o.id === selectedId);
      if (oldItem) {
        changeVote(currentSearch, oldItem.term, item.term, item.category);
        setOptions(prev => prev.map(o => {
          if (o.id === selectedId) return { ...o, selects: Math.max(0, o.selects - 1) };
          if (o.id === item.id) return { ...o, selects: o.selects + 1 };
          return o;
        }));
      }
    } 
    // First selection
    else {
      recordInteraction(currentSearch, item.term, 'SELECT', item.category);
      setOptions(prev => prev.map(o => 
        o.id === item.id ? { ...o, selects: o.selects + 1 } : o
      ));
      setGlobalCount(prev => prev + 1);
    }

    setSelectedId(item.id);
    setRecentActivity(getRecentActivity());
  };

  const handleReject = (item: TranslationItem, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (selectedId) return;
    recordInteraction(currentSearch, item.term, 'REJECT', item.category);
    setOptions(prev => prev.filter(o => o.id !== item.id));
  };

  const submitUserSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestionError(null);

    if (!newSuggestion.trim()) return;

    const rawTerm = newSuggestion.trim();
    const inputIsChinese = containsChinese(currentSearch);
    const suggestionHasChinese = containsChinese(rawTerm);

    if (inputIsChinese && suggestionHasChinese) {
      setSuggestionError("Input is Chinese. Please suggest an English translation.");
      return;
    }

    if (!inputIsChinese && !suggestionHasChinese) {
      setSuggestionError("Input is English. Please suggest a Chinese translation.");
      return;
    }

    const capitalizedTerm = !suggestionHasChinese 
      ? rawTerm.charAt(0).toUpperCase() + rawTerm.slice(1) 
      : rawTerm;

    const category = "User Suggested" as any;
    addUserSuggestion(currentSearch, capitalizedTerm);
    recordInteraction(currentSearch, capitalizedTerm, 'SELECT', category);

    const newItem: TranslationItem = {
      id: capitalizedTerm, 
      term: capitalizedTerm,
      context: "User Suggested definition",
      category: category,
      selects: 1, 
      rejects: 0,
      origin: 'USER'
    };

    setOptions(prev => [newItem, ...prev].slice(0, 6)); 
    setNewSuggestion('');
    setShowSuggestInput(false);
    setHasSuggested(true); 
    setSelectedId(newItem.id);
    setGlobalCount(prev => prev + 1);
    setRecentActivity(getRecentActivity());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50/50 via-slate-50 to-slate-100">
      <Header contributionCount={globalCount} />

      <main className="flex-grow flex flex-col items-center max-w-5xl mx-auto w-full px-3 py-24 md:px-6 md:py-32 transition-all duration-500">
        
        {/* Search Section */}
        <div className="w-full max-w-2xl text-center mb-8 md:mb-12 animate-card-enter" style={{ animationDelay: '0ms' }}>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
            Clinical Term Translator
          </h2>
          <p className="text-slate-500 text-sm md:text-base mb-8 max-w-lg mx-auto leading-relaxed px-4">
            Enter a medical term in Chinese or English. Our AI suggests translations, and your selection trains the system.
          </p>

          <form onSubmit={handleSearch} className="relative group mx-2">
            <div className="absolute inset-0 bg-teal-200 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex items-center shadow-xl shadow-slate-200/50 rounded-full bg-white transition-all duration-300 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:scale-[1.01]">
               <svg 
                className="absolute left-6 text-slate-400 w-5 h-5" 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={inputTerm}
                onChange={(e) => setInputTerm(e.target.value)}
                placeholder="e.g. 消瘦, Palpitations..."
                className="w-full pl-14 pr-32 py-4 md:py-5 rounded-full border-none outline-none text-base md:text-lg text-slate-700 placeholder-slate-400 bg-transparent"
              />
              <button
                type="submit"
                disabled={loading || !inputTerm.trim()}
                className="absolute right-2.5 top-2.5 bottom-2.5 bg-slate-900 hover:bg-teal-600 text-white px-6 md:px-8 rounded-full font-bold text-xs md:text-sm transition-all duration-300 disabled:opacity-50 disabled:hover:bg-slate-900 btn-click-effect shadow-md"
              >
                {loading ? 'Analyzing...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {options.length > 0 && (
          <div className="w-full flex flex-col gap-4">
            
            {/* Context Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center px-2 animate-card-enter" style={{ animationDelay: '100ms' }}>
              <div className="flex-1">
                {selectedId ? (
                   <h3 className="text-base font-bold text-teal-600 animate-in slide-in-from-left-2 duration-300 flex items-center gap-2">
                     <span className="bg-teal-100 p-1 rounded-full">🎉</span> Thank you for your contribution!
                   </h3>
                ) : (
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                      Suggestions for "<span className="text-slate-700">{currentSearch}</span>"
                    </h3>
                    {correction && correction !== inputTerm.trim() && (
                      <p className="text-teal-600 text-xs mt-1 animate-pulse">
                        <span className="font-semibold">Note:</span> Corrected to "{correction}".
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {!selectedId && !hasSuggested && (
                <button 
                  onClick={() => setShowSuggestInput(!showSuggestInput)}
                  className="mt-2 md:mt-0 text-teal-600 text-xs md:text-sm font-bold hover:text-teal-700 flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-full transition-all duration-300 btn-click-effect"
                >
                  <span className="text-lg leading-none">+</span> Suggest Term
                </button>
              )}
            </div>

            {/* User Suggestion Input - Smooth Expand */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showSuggestInput && !selectedId && !hasSuggested ? 'max-h-32 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
              <form onSubmit={submitUserSuggestion} className="px-1 pt-1">
                <div className="bg-white p-2 rounded-full border border-teal-200 shadow-lg shadow-teal-500/5 flex gap-2 pl-5 focus-within:ring-2 focus-within:ring-teal-500/20 transition-shadow">
                  <input 
                    autoFocus={showSuggestInput}
                    type="text"
                    value={newSuggestion}
                    onChange={e => {
                      setNewSuggestion(e.target.value);
                      if (suggestionError) setSuggestionError(null);
                    }}
                    placeholder={containsChinese(currentSearch) ? "Enter English translation..." : "Enter Chinese translation..."}
                    className="flex-grow py-2 text-slate-800 bg-transparent focus:outline-none text-sm placeholder-slate-400"
                  />
                  <button 
                    type="submit"
                    className="bg-teal-500 text-white px-6 py-2 rounded-full text-xs md:text-sm font-bold hover:bg-teal-600 transition-colors btn-click-effect shadow-sm"
                  >
                    Add
                  </button>
                </div>
                {suggestionError && (
                  <p className="text-red-500 text-xs px-5 mt-2 font-semibold animate-bounce">{suggestionError}</p>
                )}
              </form>
            </div>

            {/* Cards Grid - 3 Columns Preserved */}
            <div className="grid grid-cols-3 gap-3 md:gap-5 pb-4">
              {options.map((item, index) => {
                 const isSelected = selectedId === item.id;
                 const isFaded = selectedId !== null && !isSelected;
                 
                 return (
                  <OptionCard
                    key={item.id}
                    item={item}
                    rank={index}
                    isSelected={isSelected}
                    isFaded={isFaded}
                    onSelect={() => handleSelect(item)}
                    onReject={(e) => handleReject(item, e)}
                    disabled={loading} 
                  />
                 );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {options.length === 0 && !loading && !error && currentSearch && (
           <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300 w-full max-w-xl mx-4 animate-card-enter">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🤔</div>
              <p className="text-slate-500 font-medium text-sm mb-2">No suitable suggestions found.</p>
              {!hasSuggested && (
                <button onClick={() => setShowSuggestInput(true)} className="text-teal-600 font-bold hover:underline text-sm btn-click-effect">
                  Suggest one manually
                </button>
              )}
           </div>
        )}

        {/* Loading Skeleton - Staggered */}
        {loading && (
          <div className="w-full grid grid-cols-3 gap-3 md:gap-5">
             {[0, 1, 2, 3, 4, 5].map((i) => (
               <div 
                  key={i} 
                  className="h-40 md:h-48 bg-slate-200/70 rounded-3xl animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
               ></div>
             ))}
          </div>
        )}

        {/* Recent Activity Footer */}
        <div className="mt-16 md:mt-24 w-full pt-8 border-t border-slate-200/60 animate-card-enter" style={{ animationDelay: '300ms' }}>
          <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-5 tracking-widest text-center">Community Training Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center col-span-2">No recent contributions.</p>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} className="group flex items-center justify-between bg-white hover:bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white ${act.action === 'verified' ? 'bg-green-500 shadow-green-200' : 'bg-purple-500 shadow-purple-200'}`}></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 line-clamp-1 group-hover:text-slate-900 transition-colors">
                        {act.original} <span className="text-slate-300 mx-1">→</span> {act.translation}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {act.action === 'verified' ? 'Verified by User' : 'New Suggestion'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono hidden sm:block">
                    {new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;