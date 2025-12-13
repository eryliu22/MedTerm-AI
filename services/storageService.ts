import { TermData, TranslationItem, AiResponse, TranslationCategory, RecentActivityItem } from '../types';

const VOTES_KEY = 'medterm_data';
const ACTIVITY_KEY = 'medterm_activity';

// Helper to get all data
const getDb = (): Record<string, TermData> => {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.error("Failed to parse storage data:", error);
    return {};
  }
};

// Helper to save data
const saveDb = (data: Record<string, TermData>) => {
  localStorage.setItem(VOTES_KEY, JSON.stringify(data));
};

export const mergeAndRankResults = (originalTerm: string, aiResults: AiResponse | null): TranslationItem[] => {
  const db = getDb();
  const history = db[originalTerm] || {};
  
  let candidates: TranslationItem[] = [];
  const seenTerms = new Set<string>();

  // Helper to add unique candidate
  // Uses lowercase for case-insensitive deduplication to handle similar AI suggestions
  const addCandidate = (item: TranslationItem) => {
    const normalized = item.term.toLowerCase().trim();
    if (!seenTerms.has(normalized)) {
      seenTerms.add(normalized);
      candidates.push(item);
    }
  };

  // 1. Convert AI Results to Candidates
  if (aiResults) {
    const mapToItem = (key: 'literal' | 'clinical' | 'descriptive', cat: TranslationCategory): TranslationItem | null => {
      const t = aiResults[key];
      if (!t || !t.term || !t.context) {
        console.warn(`Missing data for ${key} translation`);
        return null;
      }
      // Check if we have stored data for this specific term
      // We search keys case-insensitively to match existing DB entries if possible
      const dbKey = Object.keys(history).find(k => k.toLowerCase() === t.term.toLowerCase()) || t.term;
      const stored = history[dbKey] || { selects: 0, rejects: 0, origin: 'AI' as const };
      
      return {
        id: dbKey, // Use the key that matches DB if exists, otherwise AI term
        term: t.term, // Keep original casing from AI for display usually, unless we want to enforce DB casing
        context: t.context,
        category: cat,
        selects: stored.selects,
        rejects: stored.rejects,
        origin: 'AI'
      };
    };

    // Priority order for deduplication: Clinical -> Literal -> Descriptive
    const clinical = mapToItem('clinical', TranslationCategory.CLINICAL);
    const literal = mapToItem('literal', TranslationCategory.LITERAL);
    const descriptive = mapToItem('descriptive', TranslationCategory.DESCRIPTIVE);
    
    if (clinical) addCandidate(clinical);
    if (literal) addCandidate(literal);
    if (descriptive) addCandidate(descriptive);
  }

  // 2. Add User Suggestions from History
  Object.entries(history).forEach(([term, data]) => {
    const item: TranslationItem = {
      id: term,
      term: term,
      context: "User Suggested Translation",
      category: data.category,
      selects: data.selects,
      rejects: data.rejects,
      origin: data.origin
    };
    
    // Logic: If AI returned it, we likely already added it above (seenTerms check handles this).
    // If not, we add this user version.
    addCandidate(item);
  });

  // 3. Filter: Remove if Rejected > 3 times
  candidates = candidates.filter(c => c.rejects <= 3);

  // 4. Scoring Algorithm
  const getScore = (item: TranslationItem) => {
    let score = 0;

    // RULE: If a word is chosen by user before (selects > 0), it outweighs category rules.
    // We give a massive multiplier to selects.
    score += item.selects * 100;

    // Base Priority (Tie-breakers if counts are equal)
    if (item.category === TranslationCategory.CLINICAL) score += 4;
    if (item.category === TranslationCategory.LITERAL) score += 3;
    if (item.category === TranslationCategory.DESCRIPTIVE) score += 2;
    if (item.category === TranslationCategory.USER) score += 1; 

    return score;
  };

  // 5. Sort
  candidates.sort((a, b) => getScore(b) - getScore(a));

  // 6. Limit to 6
  return candidates.slice(0, 6);
};

export const recordInteraction = (
  originalTerm: string, 
  targetTerm: string, 
  type: 'SELECT' | 'REJECT', 
  category?: TranslationCategory
) => {
  const db = getDb();
  if (!db[originalTerm]) db[originalTerm] = {};

  const record = db[originalTerm][targetTerm] || {
    selects: 0,
    rejects: 0,
    category: category || TranslationCategory.USER,
    origin: 'USER', 
    lastUpdated: new Date().toISOString()
  };

  if (type === 'SELECT') {
    record.selects++;
    addRecentActivity(originalTerm, targetTerm, 'verified');
  } else {
    record.rejects++;
  }
  
  db[originalTerm][targetTerm] = record;
  saveDb(db);
};

export const removeVote = (originalTerm: string, targetTerm: string) => {
  const db = getDb();
  if (!db[originalTerm] || !db[originalTerm][targetTerm]) return;

  // Decrement selects, but don't go below 0
  db[originalTerm][targetTerm].selects = Math.max(0, db[originalTerm][targetTerm].selects - 1);
  saveDb(db);

  // Remove from activity log so it doesn't show as verified anymore
  removeFromRecentActivity(originalTerm, targetTerm);
};

export const changeVote = (
  originalTerm: string,
  oldTerm: string,
  newTerm: string,
  category: TranslationCategory
) => {
  const db = getDb();
  if (!db[originalTerm]) return; 

  // 1. Decrement Old
  if (db[originalTerm][oldTerm]) {
    db[originalTerm][oldTerm].selects = Math.max(0, db[originalTerm][oldTerm].selects - 1);
  }

  // 2. Increment New
  if (!db[originalTerm][newTerm]) {
    db[originalTerm][newTerm] = {
      selects: 0,
      rejects: 0,
      category: category,
      origin: 'USER',
      lastUpdated: new Date().toISOString()
    };
  }
  db[originalTerm][newTerm].selects++;

  saveDb(db);
  
  // Update activity: Swap the old verified term with the new one
  updateRecentActivity(originalTerm, oldTerm, newTerm);
};

export const addUserSuggestion = (originalTerm: string, suggestion: string) => {
  const db = getDb();
  if (!db[originalTerm]) db[originalTerm] = {};

  db[originalTerm][suggestion] = {
    selects: 0, // Initialize with 0 so we can explicitly 'select' it later to record the vote properly
    rejects: 0,
    category: TranslationCategory.USER,
    origin: 'USER',
    lastUpdated: new Date().toISOString()
  };

  saveDb(db);
  addRecentActivity(originalTerm, suggestion, 'suggested');
};

// INTERNAL HELPERS FOR ACTIVITY LOGGING

const getRecentActivityRaw = (): RecentActivityItem[] => {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse recent activity:", error);
    return [];
  }
};

const saveRecentActivityRaw = (list: RecentActivityItem[]) => {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(0, 10)));
};

const addRecentActivity = (original: string, translation: string, action: 'suggested' | 'verified') => {
  const list = getRecentActivityRaw();
  
  // Remove duplication if the top item is exactly the same
  if (list.length > 0) {
    const top = list[0];
    if (top.original === original && top.translation === translation && top.action === action) {
      return; 
    }
  }
  
  const newItem: RecentActivityItem = {
    original,
    translation,
    action,
    timestamp: new Date().toISOString()
  };
  
  list.unshift(newItem);
  saveRecentActivityRaw(list);
};

const updateRecentActivity = (original: string, oldTranslation: string, newTranslation: string) => {
  const list = getRecentActivityRaw();
  
  // Find the entry for the old translation (verified)
  const index = list.findIndex(i => i.original === original && i.translation === oldTranslation && i.action === 'verified');

  if (index !== -1) {
    // Update existing entry
    list[index].translation = newTranslation;
    list[index].timestamp = new Date().toISOString();
    
    // Move to top to show it just happened
    const item = list.splice(index, 1)[0];
    list.unshift(item);
  } else {
    // If not found in recent history, treat as new
    list.unshift({
      original,
      translation: newTranslation,
      action: 'verified',
      timestamp: new Date().toISOString()
    });
  }
  
  saveRecentActivityRaw(list);
};

const removeFromRecentActivity = (original: string, translation: string) => {
  let list = getRecentActivityRaw();
  // Filter out the verified entry for this specific term
  list = list.filter(i => !(i.original === original && i.translation === translation && i.action === 'verified'));
  saveRecentActivityRaw(list);
};

export const getRecentActivity = (): RecentActivityItem[] => {
  return getRecentActivityRaw();
};

export const getTotalContributions = (): number => {
  const db = getDb();
  let total = 0;
  Object.values(db).forEach(termData => {
    Object.values(termData).forEach(entry => {
      total += entry.selects;
    });
  });
  return total;
};