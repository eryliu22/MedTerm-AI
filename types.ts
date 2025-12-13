export enum TranslationCategory {
  LITERAL = 'Literal/Common',
  CLINICAL = 'Clinical/Formal',
  DESCRIPTIVE = 'Descriptive',
  USER = 'User Suggested'
}

export interface TranslationItem {
  id: string; // Unique ID for the term
  term: string;
  context: string;
  category: TranslationCategory;
  selects: number;
  rejects: number;
  origin: 'AI' | 'USER';
}

export interface AiResponse {
  correction?: string; // If the input was a typo, this is the corrected term
  literal: { term: string; context: string };
  clinical: { term: string; context: string };
  descriptive: { term: string; context: string };
}

export interface TermData {
  // The persistent record for a specific term (e.g., "消瘦")
  [translation: string]: {
    selects: number;
    rejects: number;
    category: TranslationCategory;
    origin: 'AI' | 'USER';
    lastUpdated: string;
  };
}

export interface RecentActivityItem {
  original: string;
  translation: string;
  action: 'suggested' | 'verified';
  timestamp: string;
}