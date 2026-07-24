import { withLeitnerCardType, type LeitnerCardType } from './leitnerCardTypes';
import type { ImageOcclusionPayload } from './imageOcclusionCards';
import { loadJson, saveJson } from './persistence';

export type CustomLeitnerCard = {
  front: string;
  back: string;
  source?: 'scratchpad' | 'reader-selection' | 'reader-occlusion' | 'concept-map' | 'quiz-mistake' | 'quiz-selection' | 'compare' | 'debate' | 'notebooklm-quiz';
  cardType?: LeitnerCardType;
  occlusion?: ImageOcclusionPayload;
};

const KEY = 'leitner-custom-cards';

export function loadCustomLeitnerCards(scopeKey: string): CustomLeitnerCard[] {
  return loadJson<Record<string, CustomLeitnerCard[]>>(KEY, {})[scopeKey] ?? [];
}

export function appendCustomLeitnerCard(scopeKey: string, card: CustomLeitnerCard): CustomLeitnerCard[] {
  return appendCustomLeitnerCards(scopeKey, [card]).cards;
}

export function appendCustomLeitnerCards(
  scopeKey: string,
  cards: CustomLeitnerCard[],
): { cards: CustomLeitnerCard[]; added: number } {
  const all = loadJson<Record<string, CustomLeitnerCard[]>>(KEY, {});
  const prev = all[scopeKey] ?? [];
  const byFront = new Map(prev.map((c) => [c.front.trim().toLowerCase(), c]));
  let added = 0;

  for (const card of cards) {
    const normalized = withLeitnerCardType(card);
    const key = normalized.front.trim().toLowerCase();
    if (!key) continue;
    const isNew = !byFront.has(key);
    byFront.set(key, normalized);
    if (isNew) added += 1;
  }

  const next = [...byFront.values()];
  all[scopeKey] = next;
  saveJson(KEY, all);
  return { cards: next, added };
}

export function removeCustomLeitnerCard(scopeKey: string, front: string): CustomLeitnerCard[] {
  const all = loadJson<Record<string, CustomLeitnerCard[]>>(KEY, {});
  const next = (all[scopeKey] ?? []).filter((c) => c.front !== front);
  if (next.length === 0) delete all[scopeKey];
  else all[scopeKey] = next;
  saveJson(KEY, all);
  return next;
}
