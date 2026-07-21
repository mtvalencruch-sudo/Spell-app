import { PracticeHistory } from "../types";
import { supabase } from "../../supabaseClient";

const STORAGE_KEY = "spell_it_history";

function readHistory(): PracticeHistory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(history: PracticeHistory[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function mapDbRowToHistory(row: any): PracticeHistory {
  return {
    id: row.id,
    setDate: row.set_date || new Date().toISOString(),
    correctCount: row.correct_count ?? 0,
    totalWords: row.total_words ?? 0,
    streak: row.streak ?? 0,
    listCode: row.list_code || "",
    listName: row.list_name || "",
    details: Array.isArray(row.details) ? row.details : [],
    studentName: row.student_name || undefined,
    studentClass: row.student_class || undefined,
  };
}

export async function loadHistory(): Promise<PracticeHistory[]> {
  try {
    const { data, error } = await supabase
      .from("practice_history")
      .select("*")
      .order("set_date", { ascending: false });

    if (!error && data && Array.isArray(data)) {
      const mapped = data.map(mapDbRowToHistory);
      writeHistory(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn("Supabase fetch practice_history error, using local fallback", err);
  }

  return readHistory().sort(
    (a, b) => new Date(b.setDate).getTime() - new Date(a.setDate).getTime()
  );
}

export async function addSession(
  session: Omit<PracticeHistory, "id" | "setDate">
): Promise<PracticeHistory | null> {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const setDate = new Date().toISOString();
  const newSession: PracticeHistory = {
    ...session,
    id,
    setDate,
  };

  // Write to Supabase Database
  try {
    const dbPayload = {
      id,
      set_date: setDate,
      correct_count: session.correctCount,
      total_words: session.totalWords,
      streak: session.streak || 0,
      list_code: session.listCode,
      list_name: session.listName,
      details: session.details || [],
      student_name: session.studentName || null,
      student_class: session.studentClass || null,
    };
    const { error } = await supabase.from("practice_history").insert(dbPayload);
    if (error) {
      console.warn("Supabase insert practice_history error:", error);
    }
  } catch (err) {
    console.warn("Supabase insert practice_history exception, saved locally", err);
  }

  const history = readHistory();
  history.unshift(newSession);
  writeHistory(history);
  return newSession;
}

export async function clearHistory(): Promise<void> {
  try {
    const { error } = await supabase.from("practice_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.warn("Supabase clear practice_history error:", error);
    }
  } catch (err) {
    console.warn("Supabase clear history exception", err);
  }
  writeHistory([]);
}
