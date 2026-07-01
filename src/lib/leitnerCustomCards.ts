import { withLeitnerCardType, type LeitnerCardType } from './leitnerCardTypes';
import { loadJson, saveJson } from './persistence';

export type CustomLeitnerCard = {
  front: string;
  back: string;
  source?: 'scratchpad' | 'reader-selection' | 'concept-map' | 'quiz-mistake' | 'quiz-selection' | 'compare' | 'debate';
  cardType?: LeitnerCardType;
};

const KEY = 'leitner-custom-cards';

export function loadCustomLeitnerCards(scopeKey: string): CustomLeitnerCard[] {
  return loadJson<Record<string, CustomLeitnerCard[]>>(KEY, {})[scopeKey] ?? [];
}

export function appendCustomLeitnerCard(scopeKey: string, card: CustomLeitnerCard): CustomLeitnerCard[] {
  const all = loadJson<Record<string, CustomLeitnerCard[]>>(KEY, {});
  const prev = all[scopeKey] ?? [];
  const normalized = withLeitnerCardType(card);
  const next = [...prev.filter((c) => c.front !== normalized.front), normalized];
  all[scopeKey] = next;
  saveJson(KEY, all);
  return next;
}

export function removeCustomLeitnerCard(scopeKey: string, front: string): CustomLeitnerCard[] {
  const all = loadJson<Record<string, CustomLeitnerCard[]>>(KEY, {});
  const next = (all[scopeKey] ?? []).filter((c) => c.front !== front);
  if (next.length === 0) delete all[scopeKey];
  else all[scopeKey] = next;
  saveJson(KEY, all);
  return next;
}
