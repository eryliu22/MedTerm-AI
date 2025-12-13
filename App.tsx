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
  const [hasSuggested, setHasSuggested] = useState(false); // Track if user has added a suggestion for this search

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
    setHasSuggested(false); // Reset suggestion limit
    setSuggestionError(null);
    
    const searchTerm = inputTerm.trim();

    // 1. Get AI Results (or handle offline/fail)
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

    // 3. Merge and Rank (The "Brain")
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
    // Case 1: Unselect (Toggle off)
    if (selectedId === item.id) {
      // Remove vote from DB
      removeVote(currentSearch, item.term);
      
      // Update UI: Decrement this item
      setOptions(prev => prev.map(o => 
        o.id === item.id ? { ...o, selects: Math.max(0, o.selects - 1) } : o
      ));
      
      // Clear selection state
      setSelectedId(null);
      
      // Update Global Stats
      setGlobalCount(prev => Math.max(0, prev - 1));
      return;
    }

    // Case 2: Switching from Old -> New
    if (selectedId) {
      const oldItem = options.find(o => o.id === selectedId);
      if (oldItem) {
        // DB Update
        changeVote(currentSearch, oldItem.term, item.term, item.category);
        
        // UI Update: Decrement old, Increment new
        setOptions(prev => prev.map(o => {
          if (o.id === selectedId) return { ...o, selects: Math.max(0, o.selects - 1) };
          if (o.id === item.id) return { ...o, selects: o.selects + 1 };
          return o;
        }));
      }
    } 
    // Case 3: First selection
    else {
      recordInteraction(currentSearch, item.term, 'SELECT', item.category);
      setOptions(prev => prev.map(o => 
        o.id === item.id ? { ...o, selects: o.selects + 1 } : o
      ));
      setGlobalCount(prev => prev + 1);
    }

    // Set new selection (for Case 2 and 3)
    setSelectedId(item.id);
    
    // Refresh global logs
    setRecentActivity(getRecentActivity());
  };

  const handleReject = (item: TranslationItem, e: React.MouseEvent) => {
    e.stopPropagation(); 
    
    // Disable reject if currently selected (prevent weird states)
    if (selectedId) return;

    recordInteraction(currentSearch, item.term, 'REJECT', item.category);
    setOptions(prev => prev.filter(o => o.id !== item.id));
  };

  const submitUserSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestionError(null);

    if (!newSuggestion.trim()) return;

    const rawTerm = newSuggestion.trim();
    
    // LANGUAGE VALIDATION
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

    // Capitalize first letter if it's English
    const capitalizedTerm = !suggestionHasChinese 
      ? rawTerm.charAt(0).toUpperCase() + rawTerm.slice(1) 
      : rawTerm;

    const category = "User Suggested" as any;

    // 1. Add to DB as a suggestion (0 selects)
    addUserSuggestion(currentSearch, capitalizedTerm);
    
    // 2. Immediately Record Interaction as Selected (1 select, +Verified activity)
    recordInteraction(currentSearch, capitalizedTerm, 'SELECT', category);

    // 3. Create Item for UI with 1 select
    const newItem: TranslationItem = {
      id: capitalizedTerm, 
      term: capitalizedTerm,
      context: "User Suggested definition",
      category: category,
      selects: 1, // Visually selected
      rejects: 0,
      origin: 'USER'
    };

    setOptions(prev => [newItem, ...prev].slice(0, 6)); 
    setNewSuggestion('');
    setShowSuggestInput(false);
    setHasSuggested(true); 
    
    // 4. Update Selection State
    setSelectedId(newItem.id);
    setGlobalCount(prev => prev + 1);
    
    // 5. Update Activity Feed
    setRecentActivity(getRecentActivity());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Header contributionCount={globalCount} />

      <main className="flex-grow flex flex-col items-center max-w-6xl mx-auto w-full px-2 py-6 md:px-4 md:py-8">
        
        {/* Search Section */}
        <div className="w-full max-w-2xl text-center mb-6 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">
            Clinical Term Translator
          </h2>
          <p className="text-slate-500 text-sm md:text-base mb-6 max-w-lg mx-auto leading-relaxed px-4">
            Enter a medical term in Chinese or English. Our AI will suggest translations, and your selection helps train the system for future medical professionals.
          </p>

          <form onSubmit={handleSearch} className="relative shadow-lg rounded-full mx-4">
            <input
              type="text"
              value={inputTerm}
              onChange={(e) => setInputTerm(e.target.value)}
              placeholder="e.g. 消瘦, Palpitations..."
              className="w-full px-6 py-4 rounded-full border-2 border-slate-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all pl-12 text-base md:text-lg bg-white"
            />
            <svg 
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <button
              type="submit"
              disabled={loading || !inputTerm.trim()}
              className="absolute right-2 top-2 bottom-2 bg-slate-900 hover:bg-slate-800 text-white px-5 md:px-8 rounded-full font-semibold text-xs md:text-sm transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {loading ? 'Analyzing...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {options.length > 0 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 px-2 gap-2 min-h-[40px]">
              <div>
                {selectedId ? (
                   <h3 className="text-sm md:text-base font-bold text-teal-600 animate-bounce">
                     Thank you for your suggestion!
                   </h3>
                ) : (
                  <>
                    <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">
                      Suggestions for "{currentSearch}"
                    </h3>
                    {correction && correction !== inputTerm.trim() && (
                      <p className="text-teal-600 text-xs mt-1">
                        <span className="font-semibold">Note:</span> We corrected "{inputTerm}" to the medical term "{correction}".
                      </p>
                    )}
                  </>
                )}
              </div>
              
              {!selectedId && !hasSuggested && (
                <button 
                  onClick={() => setShowSuggestInput(!showSuggestInput)}
                  className="text-teal-600 text-xs md:text-sm font-bold hover:underline flex items-center gap-1 bg-teal-50 px-3 py-1.5 rounded-full transition-colors self-end md:self-auto"
                >
                  + Suggest New Term
                </button>
              )}
            </div>

            {/* Suggestion Input Panel */}
            {showSuggestInput && !selectedId && !hasSuggested && (
              <form onSubmit={submitUserSuggestion} className="mb-6 flex flex-col gap-1">
                <div className="bg-white p-2 rounded-full border border-teal-100 shadow-md flex gap-2 pl-4">
                  <input 
                    autoFocus
                    type="text"
                    value={newSuggestion}
                    onChange={e => {
                      setNewSuggestion(e.target.value);
                      if (suggestionError) setSuggestionError(null);
                    }}
                    placeholder={containsChinese(currentSearch) ? "Type English translation..." : "Type Chinese translation..."}
                    className="flex-grow py-2 text-slate-800 bg-transparent focus:outline-none text-sm"
                  />
                  <button 
                    type="submit"
                    className="bg-teal-600 text-white px-4 py-2 rounded-full text-xs md:text-sm font-bold hover:bg-teal-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {suggestionError && (
                  <p className="text-red-500 text-xs px-4 font-medium">{suggestionError}</p>
                )}
              </form>
            )}

            {/* Grid - FORCE 3 COLUMNS EVEN ON MOBILE */}
            <div className="grid grid-cols-3 gap-2 md:gap-6">
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
                    // Disabled only if loading, otherwise allow click to switch (even if faded)
                    disabled={loading} 
                  />
                 );
              })}
            </div>
          </div>
        )}

        {/* Empty State / Error */}
        {options.length === 0 && !loading && !error && currentSearch && (
           <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 w-full max-w-2xl mx-4">
              <p className="text-slate-500 font-medium text-sm">All suggestions rejected or none found.</p>
              {!hasSuggested && (
                <button onClick={() => setShowSuggestInput(true)} className="mt-2 text-teal-600 font-bold hover:underline text-sm">
                  Suggest a term manually
                </button>
              )}
           </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="w-full grid grid-cols-3 gap-2 md:gap-6 animate-pulse">
             {[1, 2, 3].map((i) => (
               <div key={i} className="h-48 md:h-64 bg-slate-200 rounded-3xl"></div>
             ))}
          </div>
        )}

        {/* Recent Activity Footer */}
        <div className="mt-12 md:mt-20 w-full pt-8 border-t border-slate-200">
          <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest text-center">Community Training Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center col-span-2">No data yet.</p>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shadow-sm ${act.action === 'verified' ? 'bg-green-500 shadow-green-200' : 'bg-purple-500 shadow-purple-200'}`}></span>
                    <div className="flex flex-col">
                      <span className="text-xs md:text-sm font-bold text-slate-800 line-clamp-1">
                        {act.original} <span className="text-slate-400 mx-1">→</span> {act.translation}
                      </span>
                      <span className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">
                        {act.action === 'verified' ? 'Verified' : 'New'}
                      </span>
                    </div>
                  </div>
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