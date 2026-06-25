import type { Lang } from './i18n';
import type { QuizDef } from './lessonTypes';
import type { GlossaryEntry } from '../types';
import { buildAdaptiveQuizFromNotes } from './noteContentExtractors';
import { buildFallbackQuizFromPassage } from './workspaceContentFallback';
import { loadJson, saveJson } from './persistence';

export type QuizSessionItem = {
  id: string;
  quiz: QuizDef;
};

export type QuizSessionState = {
  scopeKey: string;
  concept: string;
  items: QuizSessionItem[];
  currentIndex: number;
  confidenceRatings: number[];
  correctFlags: boolean[];
  completedAt?: string;
};

const SESSION_KEY = 'quiz-session-state';

export function buildQuizSession(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
  ability: number,
  mastery: number,
  count = 3,
): QuizSessionItem[] {
  const items: QuizSessionItem[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count + 2; i++) {
    const q = buildAdaptiveQuizFromNotes(text, concept, glossary, lang, ability + i * 0.15, mastery);
    if (!q) {
      const fb = buildFallbackQuizFromPassage(text, concept, glossary, lang, i);
      if (fb) {
        const key = JSON.stringify(fb).slice(0, 120);
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ id: `q-${items.length}`, quiz: fb });
        }
      }
      continue;
    }
    const key = JSON.stringify(q).slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ id: `q-${items.length}`, quiz: q });
    if (items.length >= count) break;
  }
  return items;
}

export function loadQuizSession(scopeKey: string, concept: string): QuizSessionState | null {
  const all = loadJson<Record<string, QuizSessionState>>(SESSION_KEY, {});
  const s = all[scopeKey];
  if (!s || s.concept !== concept) return null;
  return s;
}

export function saveQuizSession(state: QuizSessionState): void {
  const all = loadJson<Record<string, QuizSessionState>>(SESSION_KEY, {});
  all[state.scopeKey] = state;
  saveJson(SESSION_KEY, all);
}

/** Clear cached quiz sessions after source reprocess (stale question anchors). */
export function clearQuizSessions(scopeKey?: string): void {
  if (!scopeKey) {
    saveJson(SESSION_KEY, {});
    return;
  }
  const all = loadJson<Record<string, QuizSessionState>>(SESSION_KEY, {});
  delete all[scopeKey];
  saveJson(SESSION_KEY, all);
}

export function initQuizSession(
  scopeKey: string,
  concept: string,
  items: QuizSessionItem[],
): QuizSessionState {
  const state: QuizSessionState = {
    scopeKey,
    concept,
    items,
    currentIndex: 0,
    confidenceRatings: [],
    correctFlags: [],
  };
  saveQuizSession(state);
  return state;
}

export function recordSessionAnswer(
  state: QuizSessionState,
  correct: boolean,
  confidence: number,
): QuizSessionState {
  const next: QuizSessionState = {
    ...state,
    confidenceRatings: [...state.confidenceRatings, confidence],
    correctFlags: [...state.correctFlags, correct],
    currentIndex: state.currentIndex + 1,
    completedAt: state.currentIndex + 1 >= state.items.length ? new Date().toISOString() : undefined,
  };
  saveQuizSession(next);
  return next;
}

export function sessionAccuracy(state: QuizSessionState): number {
  if (state.correctFlags.length === 0) return 0;
  return Math.round(
    (state.correctFlags.filter(Boolean).length / state.correctFlags.length) * 100,
  );
}

export function meanConfidence(state: QuizSessionState): number {
  if (state.confidenceRatings.length === 0) return 0;
  return state.confidenceRatings.reduce((a, b) => a + b, 0) / state.confidenceRatings.length;
}
