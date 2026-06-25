/**
 * §2.4 / P2 — exclude low-confidence OCR/formula garbage from study tools.
 */

import { isStudyToolExcludedText } from './readerDocumentLayout';
import { isGarbageStepTitle } from './workspaceStepTitleQuality';
import type { QuizSessionItem } from './quizSession';
import type { LeitnerCard } from './leitnerSessionModel';

const FORMULA_GARBAGE = /^=?\d+[\*+\-/]/;
const OPERATOR_HEAVY = /[\*+=]{3,}/;

/** True when text is likely OCR noise, formula debris, or unusable for teaching. */
export function isSuspiciousStudyFragment(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (isStudyToolExcludedText(t)) return true;
  if (isGarbageStepTitle(t)) return true;
  if (t.length < 80 && FORMULA_GARBAGE.test(t)) return true;
  if (t.length < 60 && OPERATOR_HEAVY.test(t)) return true;
  return false;
}

export function filterLeitnerCardsByConfidence<T extends LeitnerCard>(cards: T[]): T[] {
  return cards.filter(
    (c) => !isSuspiciousStudyFragment(c.front) && !isSuspiciousStudyFragment(c.back),
  );
}

export function quizItemText(item: QuizSessionItem): string {
  const q = item.quiz;
  if ('question' in q && typeof q.question === 'string') return q.question;
  if ('prompt' in q && typeof (q as { prompt?: string }).prompt === 'string') {
    return (q as { prompt: string }).prompt;
  }
  return JSON.stringify(q).slice(0, 200);
}

export function filterQuizSessionItems(items: QuizSessionItem[]): QuizSessionItem[] {
  return items.filter((item) => !isSuspiciousStudyFragment(quizItemText(item)));
}
