import { PracticeHistory, PracticeSessionWord } from "../types";

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

export async function loadHistory(): Promise<PracticeHistory[]> {
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

  const newSession: PracticeHistory = {
    ...session,
    id,
    setDate: new Date().toISOString(),
  };

  const history = readHistory();
  history.unshift(newSession);
  writeHistory(history);
  return newSession;
}

export async function clearHistory(): Promise<void> {
  writeHistory([]);
}
