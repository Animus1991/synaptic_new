import { fsrsRetrievability } from './adaptiveScheduler';
import { conceptRelevanceScore } from './noteContentExtractors';
import type { SpacingData } from '../types';

export type FsrsDueQueueItem = {
  concept: string;
  label: string;
  dueAt: string;
  daysUntil: number;
  overdue: boolean;
  intervalDays: number;
  retrievability: number;
};

function matchesConceptScope(s: SpacingData, concept: string): boolean {
  if (!concept.trim()) return true;
  return (
    conceptRelevanceScore(s.concept, concept) >= 0.15
    || s.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 5))
  );
}

function findCardLabel(concept: string, cards: { front: string; back: string }[]): string {
  const key = concept.toLowerCase();
  const match = cards.find((c) => {
    const front = c.front.toLowerCase();
    return front.includes(key.slice(0, 8)) || key.includes(front.slice(0, 8));
  });
  return (match?.front ?? concept).slice(0, 52);
}

/** Global FSRS due queue across all tracked concepts (Dashboard / Tasks). */
export function buildGlobalFsrsDueQueue(
  spacingIntervals: SpacingData[],
  now = new Date(),
  horizonDays = 7,
  limit = 16,
): FsrsDueQueueItem[] {
  return buildFsrsDueQueue(spacingIntervals, [], '', now, horizonDays, limit);
}

/** Ordered FSRS due queue: overdue first, then by due date and retrievability. */
export function buildFsrsDueQueue(
  spacingIntervals: SpacingData[],
  cards: { front: string; back: string }[],
  concept: string,
  now = new Date(),
  horizonDays = 7,
  limit = 12,
): FsrsDueQueueItem[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const msDay = 24 * 60 * 60 * 1000;

  const items: FsrsDueQueueItem[] = [];
  for (const s of spacingIntervals) {
    if (!matchesConceptScope(s, concept)) continue;
    const dueAt = new Date(s.nextReview);
    const daysUntil = Math.floor((dueAt.getTime() - startOfToday.getTime()) / msDay);
    const overdue = dueAt.getTime() <= now.getTime();
    if (!overdue && daysUntil > horizonDays) continue;

    items.push({
      concept: s.concept,
      label: findCardLabel(s.concept, cards),
      dueAt: s.nextReview,
      daysUntil,
      overdue,
      intervalDays: s.interval,
      retrievability: fsrsRetrievability(s, now),
    });
  }

  items.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.retrievability - b.retrievability;
  });

  return items.slice(0, limit);
}

export function findDeckIndexForConcept(
  deck: { front: string; back: string }[],
  concept: string,
): number {
  const key = concept.toLowerCase();
  return deck.findIndex((c) => {
    const front = c.front.toLowerCase();
    return front.includes(key.slice(0, 8)) || key.includes(front.slice(0, 8));
  });
}
