/**
 * Scoped quiz session attempt history — synced via /v1/session (TOOL-QZ-03).
 */

import { loadJson, saveJson } from './persistence';

export type QuizAttemptRecord = {
  scopeKey: string;
  concept: string;
  accuracy: number;
  meanConfidence: number;
  wrongCount: number;
  itemCount: number;
  completedAt: string;
};

const STORAGE_KEY = 'quiz-attempt-history';
const MAX_ATTEMPTS_PER_SCOPE = 24;

type HistoryStore = Record<string, QuizAttemptRecord[]>;

function loadStore(): HistoryStore {
  return loadJson<HistoryStore>(STORAGE_KEY, {});
}

function saveStore(store: HistoryStore): void {
  saveJson(STORAGE_KEY, store);
}

export function loadAllQuizAttemptHistories(): HistoryStore {
  return loadStore();
}

export function loadQuizAttemptHistory(scopeKey: string): QuizAttemptRecord[] {
  return loadStore()[scopeKey] ?? [];
}

export function recordQuizAttemptHistory(
  scopeKey: string,
  concept: string,
  summary: {
    accuracy: number;
    meanConfidence: number;
    wrongCount: number;
    itemCount: number;
  },
): QuizAttemptRecord {
  const record: QuizAttemptRecord = {
    scopeKey,
    concept,
    accuracy: summary.accuracy,
    meanConfidence: summary.meanConfidence,
    wrongCount: summary.wrongCount,
    itemCount: summary.itemCount,
    completedAt: new Date().toISOString(),
  };
  const store = loadStore();
  const prev = store[scopeKey] ?? [];
  store[scopeKey] = [record, ...prev].slice(0, MAX_ATTEMPTS_PER_SCOPE);
  saveStore(store);
  return record;
}

export function replaceAllQuizAttemptHistories(items: HistoryStore): void {
  saveStore(items);
}

export function mergeQuizAttemptHistories(
  local: HistoryStore,
  remote: HistoryStore,
  preferRemote: boolean,
): HistoryStore {
  const merged: HistoryStore = preferRemote ? { ...local } : { ...remote };
  const source = preferRemote ? remote : local;
  const other = preferRemote ? local : remote;
  for (const [scopeKey, records] of Object.entries(source)) {
    const existing = other[scopeKey] ?? [];
    const byTime = new Map<string, QuizAttemptRecord>();
    for (const r of [...existing, ...records]) {
      byTime.set(r.completedAt, r);
    }
    merged[scopeKey] = [...byTime.values()]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, MAX_ATTEMPTS_PER_SCOPE);
  }
  return merged;
}
