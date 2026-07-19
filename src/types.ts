export type LetterType = "vowel" | "consonant" | "other";

export interface PracticeLevel {
  id: number;
  name: string;
  instructions: string;
}

export const PRACTICE_LEVELS: PracticeLevel[] = [
  {
    id: 1,
    name: "Level 1: Copy Word",
    instructions: "Look at the target word and spell it exactly as shown.",
  },
  {
    id: 2,
    name: "Level 2: Fill Vowels",
    instructions: "Fill in the missing red vowels to complete the word.",
  },
  {
    id: 3,
    name: "Level 3: Fill Consonants",
    instructions: "Fill in the missing blue consonants to complete the word.",
  },
  {
    id: 4,
    name: "Level 4: Full Memory",
    instructions: "Recall and spell the word completely from memory.",
  },
];

export interface WordMetadata {
  definition?: string;
  pictureUrl?: string;
}

export interface LevelCustomization {
  showDefinition?: boolean;
  showPicture?: boolean;
}

export interface WordSet {
  code: string;
  name: string;
  words: string[];
  createdAt: string;
  isCustom?: boolean;
  wordMetadata?: Record<string, WordMetadata>;
  levelCustomizations?: Record<number, LevelCustomization>;
}

export interface PracticeSessionWord {
  word: string;
  correct: boolean;
  userAttempt: string;
}

export interface PracticeHistory {
  id: string;
  setDate: string;
  correctCount: number;
  totalWords: number;
  streak: number;
  listCode: string;
  listName: string;
  details: PracticeSessionWord[];
  studentName?: string;
  studentClass?: string;
}

export interface PracticeState {
  currentWordIndex: number;
  attempts: string[]; // the inputs for spelling
  isCorrect: boolean | null; // null = in progress, true = correct, false = incorrect
  showFeedback: boolean;
  completedWords: PracticeSessionWord[];
}
