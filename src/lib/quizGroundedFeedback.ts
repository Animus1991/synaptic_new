/**
 * Workspace Quiz pro — grounded source-span feedback after wrong answers.
 */

import type { ConceptSpan, Course } from '../types';
import { findConceptSpan } from './conceptProvenance';
import type { Lang } from './i18n';

export type GroundedQuizFeedback = {
  message: string;
  sourceExcerpt?: string;
  fileId?: string;
  charStart?: number;
  charEnd?: number;
};

export function highlightFromQuizFeedback(
  feedback: GroundedQuizFeedback,
): { fileId: string; charStart: number; charEnd: number } | null {
  if (
    feedback.fileId
    && feedback.charStart != null
    && feedback.charEnd != null
    && feedback.charEnd > feedback.charStart
  ) {
    return {
      fileId: feedback.fileId,
      charStart: feedback.charStart,
      charEnd: feedback.charEnd,
    };
  }
  return null;
}

export function buildGroundedQuizFeedback(
  course: Course | null | undefined,
  concept: string,
  correctAnswer: string,
  lang: Lang,
): GroundedQuizFeedback {
  const span: ConceptSpan | undefined = course ? findConceptSpan(course, concept) : undefined;
  const excerpt = span?.sentence?.trim();
  if (!span || !excerpt) {
    return {
      message:
        lang === 'el'
          ? `Η σωστή απάντηση είναι «${correctAnswer}». Πρόσθεσε περισσότερο υλικό για ακριβή παραπομπή.`
          : `The correct answer is "${correctAnswer}". Upload more material for a precise source citation.`,
    };
  }
  return {
    message:
      lang === 'el'
        ? `Από τις σημειώσεις σου: «${excerpt.slice(0, 160)}»`
        : `From your notes: "${excerpt.slice(0, 160)}"`,
    sourceExcerpt: excerpt,
    fileId: span.fileId,
    charStart: span.charStart,
    charEnd: span.charEnd,
  };
}
