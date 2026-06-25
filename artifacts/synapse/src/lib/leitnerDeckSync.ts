import type { SpacingData } from '../types';
import { loadJson, saveJson } from './persistence';
import { conceptRelevanceScore } from './noteContentExtractors';

export type LeitnerDeckState = {
  index: number;
  boxCounts: number[];
  lastSyncedAt: string;
  cardOrder: string[];
};

const DECK_KEY = 'leitner-deck-state';

export function loadDeckState(scopeKey: string): LeitnerDeckState | null {
  return loadJson<Record<string, LeitnerDeckState>>(DECK_KEY, {})[scopeKey] ?? null;
}

export function saveDeckState(scopeKey: string, state: LeitnerDeckState): void {
  const all = loadJson<Record<string, LeitnerDeckState>>(DECK_KEY, {});
  all[scopeKey] = state;
  saveJson(DECK_KEY, all);
}

export type DueCard = {
  front: string;
  back: string;
  dueAt: string;
  daysUntil: number;
};

/** Order deck: due cards first (from FSRS spacing bus), then remainder. */
export function orderDeckByDueQueue(
  cards: { front: string; back: string }[],
  spacingIntervals: SpacingData[],
  concept: string,
  now = new Date(),
): { ordered: { front: string; back: string }[]; dueCount: number } {
  if (cards.length === 0) return { ordered: [], dueCount: 0 };

  const dueSet = new Set<string>();
  for (const s of spacingIntervals) {
    if (conceptRelevanceScore(s.concept, concept) < 0.2
      && !s.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 5))) continue;
    const dueMs = new Date(s.nextReview).getTime();
    if (dueMs <= now.getTime()) dueSet.add(s.concept.toLowerCase());
  }

  const scored = cards.map((c, i) => {
    const frontKey = c.front.toLowerCase();
    const due = [...dueSet].some((k) => frontKey.includes(k) || k.includes(frontKey.slice(0, 8)));
    return { card: c, i, due };
  });

  scored.sort((a, b) => {
    if (a.due !== b.due) return a.due ? -1 : 1;
    return a.i - b.i;
  });

  const dueCount = scored.filter((s) => s.due).length;
  return { ordered: scored.map((s) => s.card), dueCount };
}

export function syncDeckState(
  scopeKey: string,
  cards: { front: string; back: string }[],
  spacingIntervals: SpacingData[],
  concept: string,
): { ordered: { front: string; back: string }[]; dueCount: number; resumedIndex: number; boxCounts: number[] } {
  const { ordered, dueCount } = orderDeckByDueQueue(cards, spacingIntervals, concept);
  const prev = loadDeckState(scopeKey);
  const cardOrder = ordered.map((c) => c.front);
  const orderChanged = prev && prev.cardOrder.join('\0') !== cardOrder.join('\0');
  const resumedIndex = orderChanged ? 0 : Math.min(prev?.index ?? 0, Math.max(ordered.length - 1, 0));
  const boxCounts = prev?.boxCounts ?? [0, 0, 0, 0];

  saveDeckState(scopeKey, {
    index: resumedIndex,
    boxCounts,
    lastSyncedAt: new Date().toISOString(),
    cardOrder,
  });

  return { ordered, dueCount, resumedIndex, boxCounts };
}
