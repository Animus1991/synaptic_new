import type { SpacingData } from '../types';
import type { CustomLeitnerCard } from './leitnerCustomCards';
import { appendCustomLeitnerCards } from './leitnerCustomCards';
import type { NotebookLmImportResult, NotebookLmQuizCard } from './notebooklmImport';

export type NotebookLmFsrsImportResult = {
  added: number;
  skipped: number;
  studyConcept: string;
  scopeKey: string;
};

/** Workspace progress key used by Leitner custom cards for an NLM quiz deck. */
export function notebookLmProgressKey(studyConcept: string): string {
  return `concept:${studyConcept.trim() || 'NotebookLM quiz'}`;
}

export function notebookLmStudyConcept(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 80) : 'NotebookLM quiz';
}

/** Initial FSRS row — due immediately for first review. */
export function buildNewCardSpacing(concept: string, now = new Date()): SpacingData {
  return {
    concept,
    interval: 0,
    nextReview: now.toISOString(),
    stability: 0.1,
    difficulty: 0.5,
    reviewCount: 0,
  };
}

export function mergeQuizSpacing(
  existing: SpacingData[],
  quizCards: NotebookLmQuizCard[],
  now = new Date(),
): { spacing: SpacingData[]; added: number; skipped: number } {
  const seen = new Set(existing.map((s) => s.concept.trim().toLowerCase()));
  const next = [...existing];
  let added = 0;
  let skipped = 0;

  for (const card of quizCards) {
    const concept = card.front.trim();
    if (!concept) continue;
    const key = concept.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    next.push(buildNewCardSpacing(concept, now));
    added += 1;
  }

  return { spacing: next, added, skipped };
}

export function quizCardsToCustomLeitnerCards(
  quizCards: NotebookLmQuizCard[],
): CustomLeitnerCard[] {
  return quizCards.map((c) => ({
    front: c.front,
    back: c.back,
    source: 'notebooklm-quiz' as const,
  }));
}

/** Persist quiz cards to Leitner + seed FSRS spacing rows (pure card/spacing merge). */
export function prepareNotebookLmFsrsImport(
  result: NotebookLmImportResult,
  existingSpacing: SpacingData[],
  now = new Date(),
): {
  studyConcept: string;
  scopeKey: string;
  customCards: CustomLeitnerCard[];
  spacing: SpacingData[];
  added: number;
  skipped: number;
} {
  const studyConcept = notebookLmStudyConcept(result.title);
  const scopeKey = notebookLmProgressKey(studyConcept);
  const customCards = quizCardsToCustomLeitnerCards(result.quizCards);
  const cardMerge = appendCustomLeitnerCards(scopeKey, customCards);
  const spacingMerge = mergeQuizSpacing(existingSpacing, result.quizCards, now);

  return {
    studyConcept,
    scopeKey,
    customCards: cardMerge.cards,
    spacing: spacingMerge.spacing,
    added: cardMerge.added,
    skipped: Math.max(spacingMerge.skipped, result.quizCards.length - cardMerge.added),
  };
}
