import { WordSet, WordMetadata, LevelCustomization } from "../types";
import { supabase } from "../../supabaseClient";

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

function mapDbRowToWordSet(row: any): WordSet {
  return {
    code: row.code,
    name: row.name,
    words: Array.isArray(row.words) ? row.words : [],
    createdAt: row.created_at || new Date().toISOString(),
    isCustom: row.is_custom ?? true,
    wordMetadata: row.word_metadata || undefined,
    levelCustomizations: row.level_customizations || undefined,
  };
}

export async function loadAllSets(): Promise<WordSet[]> {
  try {
    const { data, error } = await supabase
      .from("word_sets")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && Array.isArray(data)) {
      const mapped = data.map(mapDbRowToWordSet);
      writeSets(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn("Supabase fetch word_sets error, using local cache", err);
  }
  return readSets().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getSetsByCodes(codes: string[]): Promise<WordSet[]> {
  if (codes.length === 0) return [];
  const upper = codes.map((c) => c.toUpperCase());
  try {
    const { data, error } = await supabase
      .from("word_sets")
      .select("*")
      .in("code", upper);

    if (!error && data && Array.isArray(data)) {
      return data.map(mapDbRowToWordSet);
    }
  } catch (err) {
    console.warn("Supabase getSetsByCodes error, using local fallback", err);
  }
  return readSets().filter((s) => upper.includes(s.code.toUpperCase()));
}

export async function getSetByCode(code: string): Promise<WordSet | undefined> {
  const target = code.toUpperCase();
  try {
    const { data, error } = await supabase
      .from("word_sets")
      .select("*")
      .ilike("code", target)
      .maybeSingle();

    if (!error && data) {
      const mapped = mapDbRowToWordSet(data);
      const local = readSets();
      if (!local.some((s) => s.code.toUpperCase() === target)) {
        writeSets([mapped, ...local]);
      }
      return mapped;
    }
  } catch (err) {
    console.warn("Supabase getSetByCode error, using local fallback", err);
  }
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

  const createdAt = new Date().toISOString();
  const newSet: WordSet = {
    code: finalCode,
    name: name.trim(),
    words: words.map((w) => w.trim().toLowerCase()),
    createdAt,
    isCustom: true,
    wordMetadata: wordMetadata || undefined,
    levelCustomizations: levelCustomizations || undefined,
  };

  // Write to Supabase Database
  try {
    const dbPayload = {
      code: finalCode,
      name: name.trim(),
      words: words.map((w) => w.trim().toLowerCase()),
      created_at: createdAt,
      is_custom: true,
      word_metadata: wordMetadata || null,
      level_customizations: levelCustomizations || null,
    };
    const { error } = await supabase.from("word_sets").insert(dbPayload);
    if (error) {
      console.warn("Supabase insert word_sets error:", error);
    }
  } catch (err) {
    console.warn("Supabase insert error, saved locally", err);
  }

  writeSets([newSet, ...sets.filter((s) => s.code !== finalCode)]);
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

  // Update in Supabase Database
  try {
    const dbPayload = {
      name: name.trim(),
      words: words.map((w) => w.trim().toLowerCase()),
      word_metadata: wordMetadata || null,
      level_customizations: levelCustomizations || null,
      is_custom: true,
    };
    const { error } = await supabase.from("word_sets").update(dbPayload).ilike("code", target);
    if (error) {
      console.warn("Supabase update word_sets error:", error);
    }
  } catch (err) {
    console.warn("Supabase update error, updated locally", err);
  }

  sets[idx] = updated;
  writeSets(sets);
  return updated;
}

export async function deleteSet(code: string): Promise<void> {
  const target = code.toUpperCase();
  try {
    const { error } = await supabase.from("word_sets").delete().ilike("code", target);
    if (error) {
      console.warn("Supabase delete word_sets error:", error);
    }
  } catch (err) {
    console.warn("Supabase delete error, deleted locally", err);
  }
  writeSets(readSets().filter((s) => s.code.toUpperCase() !== target));
}
