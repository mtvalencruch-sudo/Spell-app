import { PracticeHistory, PracticeSessionWord } from "../types";
import { supabase } from "../lib/supabase";

interface PracticeSessionRow {
  id: string;
  set_date: string;
  correct_count: number;
  total_words: number;
  streak: number;
  list_code: string;
  list_name: string;
  details: PracticeSessionWord[];
  student_name: string | null;
  student_class: string | null;
}

function rowToHistory(row: PracticeSessionRow): PracticeHistory {
  return {
    id: row.id,
    setDate: row.set_date,
    correctCount: row.correct_count,
    totalWords: row.total_words,
    streak: row.streak,
    listCode: row.list_code,
    listName: row.list_name,
    details: row.details || [],
    studentName: row.student_name || undefined,
    studentClass: row.student_class || undefined,
  };
}

export async function loadHistory(): Promise<PracticeHistory[]> {
  const { data, error } = await supabase
    .from("practice_sessions")
    .select(
      "id, set_date, correct_count, total_words, streak, list_code, list_name, details, student_name, student_class"
    )
    .order("set_date", { ascending: false });

  if (error) {
    console.error("Failed to load practice history", error);
    return [];
  }
  return (data as PracticeSessionRow[]).map(rowToHistory);
}

export async function addSession(
  session: Omit<PracticeHistory, "id" | "setDate">
): Promise<PracticeHistory | null> {
  const row = {
    correct_count: session.correctCount,
    total_words: session.totalWords,
    streak: session.streak,
    list_code: session.listCode,
    list_name: session.listName,
    details: session.details,
    student_name: session.studentName || null,
    student_class: session.studentClass || null,
  };

  const { data, error } = await supabase
    .from("practice_sessions")
    .insert(row)
    .select(
      "id, set_date, correct_count, total_words, streak, list_code, list_name, details, student_name, student_class"
    )
    .maybeSingle();

  if (error) {
    console.error("Failed to save practice session", error);
    return null;
  }
  if (!data) return null;
  return rowToHistory(data as PracticeSessionRow);
}

export async function clearHistory(): Promise<void> {
  const { error } = await supabase.from("practice_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) {
    console.error("Failed to clear practice history", error);
  }
}
