import { WordSet, WordMetadata, LevelCustomization } from "../types";
import { DEFAULT_WORD_SETS } from "../constants/wordSets";

const STORAGE_KEY = "spell_it_word_sets";
const EVENT_NAME = "spell-it-wordsets-updated";

const dispatchUpdateEvent = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
};

export function loadAllSets(): WordSet[] {
  if (typeof localStorage === "undefined") {
    return DEFAULT_WORD_SETS;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WORD_SETS));
    return DEFAULT_WORD_SETS;
  }
  try {
    const parsed = JSON.parse(stored) as WordSet[];
    const oldDefaultCodes = ["short-vowels", "long-vowels", "vowel-teams", "consonant-blends", "challenging-words"];
    const filtered = parsed.filter(s => s.isCustom === true && !oldDefaultCodes.includes(s.code));
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch (e) {
    console.error("Failed to parse word sets from localStorage", e);
    return DEFAULT_WORD_SETS;
  }
}

export function getSetsByCodes(codes: string[]): WordSet[] {
  const allSets = loadAllSets();
  const codesUpper = codes.map(c => c.toUpperCase());
  return allSets.filter(set => codesUpper.includes(set.code.toUpperCase()));
}

export function createSet(
  name: string,
  words: string[],
  code?: string,
  wordMetadata?: Record<string, WordMetadata>,
  levelCustomizations?: Record<number, LevelCustomization>
): WordSet {
  const allSets = loadAllSets();
  let finalCode = code ? code.trim().toUpperCase() : "";

  if (finalCode) {
    // Check for duplicates
    const exists = allSets.some(s => s.code.toUpperCase() === finalCode);
    if (exists) {
      throw new Error(`A spelling set with code "${finalCode}" already exists.`);
    }
  } else {
    // Generate 4-char random uppercase code
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 100) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let randomCode = "";
      for (let i = 0; i < 4; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!allSets.some(s => s.code.toUpperCase() === randomCode)) {
        finalCode = randomCode;
        isUnique = true;
      }
      attempts++;
    }
    if (!finalCode) {
      finalCode = "SET" + Math.floor(100 + Math.random() * 900);
    }
  }

  const newSet: WordSet = {
    code: finalCode,
    name: name.trim(),
    words: words.map(w => w.trim().toLowerCase()),
    createdAt: new Date().toISOString(),
    isCustom: true,
    wordMetadata,
    levelCustomizations
  };

  const updatedSets = [newSet, ...allSets];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSets));
  dispatchUpdateEvent();

  return newSet;
}

export function updateSet(
  code: string,
  name: string,
  words: string[],
  wordMetadata?: Record<string, WordMetadata>,
  levelCustomizations?: Record<number, LevelCustomization>
): WordSet {
  const allSets = loadAllSets();
  const targetIndex = allSets.findIndex(s => s.code.toUpperCase() === code.toUpperCase());

  if (targetIndex === -1) {
    throw new Error(`Spelling set with code "${code}" was not found.`);
  }

  const updatedSet: WordSet = {
    ...allSets[targetIndex],
    name: name.trim(),
    words: words.map(w => w.trim().toLowerCase()),
    isCustom: true,
    wordMetadata,
    levelCustomizations
  };

  const updatedSets = [...allSets];
  updatedSets[targetIndex] = updatedSet;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSets));
  dispatchUpdateEvent();

  return updatedSet;
}

export function deleteSet(code: string): void {
  const allSets = loadAllSets();
  const updatedSets = allSets.filter(s => s.code.toUpperCase() !== code.toUpperCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSets));
  dispatchUpdateEvent();
}

export function getSetByCode(code: string): WordSet | undefined {
  const allSets = loadAllSets();
  return allSets.find(s => s.code.toUpperCase() === code.toUpperCase());
}

