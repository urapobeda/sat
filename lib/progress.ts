export type ProgressSectionFilter = "all" | "math" | "reading-writing";
export type ProgressDifficultyFilter = "all" | "easy" | "medium" | "hard";

export type PracticeProgressRecord = {
  date: string;
  difficulty: ProgressDifficultyFilter;
  id: string;
  mode: "practice";
  percentage: number;
  score: number;
  section: ProgressSectionFilter;
  total: number;
};

export type TestProgressRecord = {
  date: string;
  id: string;
  mode: "test";
  percentage: number;
  score: number;
  timeSpent: number;
  total: number;
};

export type ProgressRecord = PracticeProgressRecord | TestProgressRecord;

export type SaveProgressInput =
  | Omit<PracticeProgressRecord, "date" | "id">
  | Omit<TestProgressRecord, "date" | "id">;

const STORAGE_KEY = "sat-practice-progress";
const PROGRESS_UPDATED_EVENT = "sat-progress-updated";

export function getProgressRecords(): ProgressRecord[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProgressRecord(input: SaveProgressInput) {
  if (!canUseLocalStorage()) {
    return;
  }

  const record: ProgressRecord = {
    ...input,
    date: new Date().toISOString(),
    id: createProgressId()
  } as ProgressRecord;
  const records = [record, ...getProgressRecords()];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(PROGRESS_UPDATED_EVENT));
}

export function clearProgressRecords() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(PROGRESS_UPDATED_EVENT));
}

export function subscribeToProgressUpdates(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener(PROGRESS_UPDATED_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PROGRESS_UPDATED_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function createProgressId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
