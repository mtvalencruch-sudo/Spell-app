import { WordSet, WordMetadata, LevelCustomization } from "../types";

const EVENT_NAME = "spell-it-wordsets-updated";
const STORAGE_KEY = "spell_it_word_sets";

const dispatchUpdateEvent = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
};

function readSets(): WordSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSets(sets: WordSet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  dispatchUpdateEvent();
}

export async function loadAllSets(): Promise<WordSet[]> {
  return readSets().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getSetsByCodes(codes: string[]): Promise<WordSet[]> {
  if (codes.length === 0) return [];
  const upper = codes.map((c) => c.toUpperCase());
  return readSets().filter((s) => upper.includes(s.code.toUpperCase()));
}

export async function getSetByCode(code: string): Promise<WordSet | undefined> {
  const target = code.toUpperCase();
  return readSets().find((s) => s.code.toUpperCase() === target);
}

export async function createSet(
  name: string,
  words: string[],
  code?: string,
  wordMetadata?: Record<string, WordMetadata>,
  levelCustomizations?: Record<number, LevelCustomization>
): Promise<WordSet> {
  const sets = readSets();
  let finalCode = code ? code.trim().toUpperCase() : "";

  if (finalCode) {
    if (sets.some((s) => s.code.toUpperCase() === finalCode)) {
      throw new Error(`A spelling set with code "${finalCode}" already exists.`);
    }
  } else {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const existing = new Set(sets.map((s) => s.code.toUpperCase()));
    let attempts = 0;
    while (!finalCode && attempts < 100) {
      let random = "";
      for (let i = 0; i < 4; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!existing.has(random)) finalCode = random;
      attempts++;
    }
    if (!finalCode) finalCode = "SET" + Math.floor(100 + Math.random() * 900);
  }

  const newSet: WordSet = {
    code: finalCode,
    name: name.trim(),
    words: words.map((w) => w.trim().toLowerCase()),
    createdAt: new Date().toISOString(),
    isCustom: true,
    wordMetadata: wordMetadata || undefined,
    levelCustomizations: levelCustomizations || undefined,
  };

  writeSets([newSet, ...sets]);
  return newSet;
}

export async function updateSet(
  code: string,
  name: string,
  words: string[],
  wordMetadata?: Record<string, WordMetadata>,
  levelCustomizations?: Record<number, LevelCustomization>
): Promise<WordSet> {
  const target = code.toUpperCase();
  const sets = readSets();
  const idx = sets.findIndex((s) => s.code.toUpperCase() === target);
  if (idx === -1) {
    throw new Error(`Spelling set with code "${code}" was not found.`);
  }

  const updated: WordSet = {
    ...sets[idx],
    name: name.trim(),
    words: words.map((w) => w.trim().toLowerCase()),
    wordMetadata: wordMetadata || undefined,
    levelCustomizations: levelCustomizations || undefined,
    isCustom: true,
  };

  sets[idx] = updated;
  writeSets(sets);
  return updated;
}

export async function deleteSet(code: string): Promise<void> {
  const target = code.toUpperCase();
  writeSets(readSets().filter((s) => s.code.toUpperCase() !== target));
}
