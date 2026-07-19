import { WordSet, WordMetadata, LevelCustomization } from "../types";
import { supabase } from "../lib/supabase";

const EVENT_NAME = "spell-it-wordsets-updated";

const dispatchUpdateEvent = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
};

interface WordSetRow {
  code: string;
  name: string;
  words: string[];
  word_metadata: Record<string, WordMetadata> | null;
  level_customizations: Record<string, LevelCustomization> | null;
  is_custom: boolean | null;
  created_at: string;
}

function rowToWordSet(row: WordSetRow): WordSet {
  const levelCustomizations: Record<number, LevelCustomization> = {};
  if (row.level_customizations) {
    for (const [k, v] of Object.entries(row.level_customizations)) {
      levelCustomizations[Number(k)] = v;
    }
  }
  return {
    code: row.code,
    name: row.name,
    words: row.words || [],
    createdAt: row.created_at,
    isCustom: row.is_custom ?? true,
    wordMetadata: row.word_metadata || undefined,
    levelCustomizations: Object.keys(levelCustomizations).length > 0
      ? levelCustomizations
      : undefined,
  };
}

export async function loadAllSets(): Promise<WordSet[]> {
  const { data, error } = await supabase
    .from("word_sets")
    .select("code, name, words, word_metadata, level_customizations, is_custom, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load word sets from Supabase", error);
    return [];
  }
  return (data as WordSetRow[]).map(rowToWordSet);
}

export async function getSetsByCodes(codes: string[]): Promise<WordSet[]> {
  if (codes.length === 0) return [];
  const codesUpper = codes.map((c) => c.toUpperCase());
  const { data, error } = await supabase
    .from("word_sets")
    .select("code, name, words, word_metadata, level_customizations, is_custom, created_at")
    .in("code", codesUpper);

  if (error) {
    console.error("Failed to load sets by codes", error);
    return [];
  }
  return (data as WordSetRow[]).map(rowToWordSet);
}

export async function getSetByCode(code: string): Promise<WordSet | undefined> {
  const { data, error } = await supabase
    .from("word_sets")
    .select("code, name, words, word_metadata, level_customizations, is_custom, created_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error(`Failed to load set "${code}"`, error);
    return undefined;
  }
  if (!data) return undefined;
  return rowToWordSet(data as WordSetRow);
}

export async function createSet(
  name: string,
  words: string[],
  code?: string,
  wordMetadata?: Record<string, WordMetadata>,
  levelCustomizations?: Record<number, LevelCustomization>
): Promise<WordSet> {
  const { data: existing } = await supabase
    .from("word_sets")
    .select("code")
    .limit(1);

  let finalCode = code ? code.trim().toUpperCase() : "";

  if (finalCode) {
    const { data } = await supabase
      .from("word_sets")
      .select("code")
      .eq("code", finalCode)
      .maybeSingle();
    if (data) {
      throw new Error(`A spelling set with code "${finalCode}" already exists.`);
    }
  } else {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let isUnique = false;
    let attempts = 0;
    const seenCodes = new Set((existing || []).map((r: any) => r.code));
    while (!isUnique && attempts < 100) {
      let randomCode = "";
      for (let i = 0; i < 4; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!seenCodes.has(randomCode)) {
        const { data } = await supabase
          .from("word_sets")
          .select("code")
          .eq("code", randomCode)
          .maybeSingle();
        if (!data) {
          finalCode = randomCode;
          isUnique = true;
        }
      }
      attempts++;
    }
    if (!finalCode) {
      finalCode = "SET" + Math.floor(100 + Math.random() * 900);
    }
  }

  const levelCustomizationsJson: Record<string, LevelCustomization> = {};
  if (levelCustomizations) {
    for (const [k, v] of Object.entries(levelCustomizations)) {
      levelCustomizationsJson[String(k)] = v;
    }
  }

  const row = {
    code: finalCode,
    name: name.trim(),
    words: words.map((w) => w.trim().toLowerCase()),
    word_metadata: wordMetadata || {},
    level_customizations: levelCustomizationsJson,
    is_custom: true,
  };

  const { data, error } = await supabase
    .from("word_sets")
    .insert(row)
    .select("code, name, words, word_metadata, level_customizations, is_custom, created_at")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create spelling set.");
  }

  dispatchUpdateEvent();
  return rowToWordSet(data as WordSetRow);
}

export async function updateSet(
  code: string,
  name: string,
  words: string[],
  wordMetadata?: Record<string, WordMetadata>,
  levelCustomizations?: Record<number, LevelCustomization>
): Promise<WordSet> {
  const levelCustomizationsJson: Record<string, LevelCustomization> = {};
  if (levelCustomizations) {
    for (const [k, v] of Object.entries(levelCustomizations)) {
      levelCustomizationsJson[String(k)] = v;
    }
  }

  const { data, error } = await supabase
    .from("word_sets")
    .update({
      name: name.trim(),
      words: words.map((w) => w.trim().toLowerCase()),
      word_metadata: wordMetadata || {},
      level_customizations: levelCustomizationsJson,
      is_custom: true,
    })
    .eq("code", code.toUpperCase())
    .select("code, name, words, word_metadata, level_customizations, is_custom, created_at")
    .maybeSingle();

  if (error) {
    throw new Error(error.message || `Failed to update set "${code}".`);
  }
  if (!data) {
    throw new Error(`Spelling set with code "${code}" was not found.`);
  }

  dispatchUpdateEvent();
  return rowToWordSet(data as WordSetRow);
}

export async function deleteSet(code: string): Promise<void> {
  const { error } = await supabase
    .from("word_sets")
    .delete()
    .eq("code", code.toUpperCase());

  if (error) {
    throw new Error(error.message || `Failed to delete set "${code}".`);
  }
  dispatchUpdateEvent();
}
