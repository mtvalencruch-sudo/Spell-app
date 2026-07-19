import { LetterType } from "../types";
import { isVowel, isConsonant } from "./letterUtils";

export function classifyLetter(char: string): LetterType {
  const c = char.toLowerCase();
  if (isVowel(c)) {
    return "vowel";
  }
  if (isConsonant(c)) {
    return "consonant";
  }
  return "other";
}

export function getLetterTypeStyles(type: LetterType): {
  text: string;
  bg: string;
  border: string;
  accent: string;
} {
  switch (type) {
    case "vowel":
      return {
        text: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-200 dark:border-red-900/50",
        accent: "bg-red-500",
      };
    case "consonant":
      return {
        text: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-900/50",
        accent: "bg-blue-500",
      };
    default:
      return {
        text: "text-slate-600 dark:text-slate-400",
        bg: "bg-slate-50 dark:bg-slate-800/30",
        border: "border-slate-200 dark:border-slate-700",
        accent: "bg-slate-400",
      };
  }
}

/**
 * Scrambles a word's letters into tiles, plus adds some distractor letters if requested
 * or simply shuffles the letters of the word so they can assemble them.
 */
export function scrambleWord(word: string): string[] {
  const letters = word.split("");
  // Shuffle algorithm (Fisher-Yates)
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
}

