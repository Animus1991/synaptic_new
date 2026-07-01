/**
 * Workspace pro — focus bus navigation helpers (Reader scroll, concept span lookup).
 */

import type { ConceptSpan, Course } from '../types';
import { findConceptSpan } from './conceptProvenance';
import { paragraphIndexForTerm } from './readerBilingualSync';
import { termMatchesFocus } from './workspaceFocus';

export type FocusScrollTarget = {
  paragraphIndex: number;
  charStart?: number;
  charEnd?: number;
  sentence?: string;
};

/** Resolve where the Reader should scroll for a focus term. */
export function resolveFocusScrollTarget(
  paragraphs: string[],
  focusTerm: string | undefined,
  course?: Course | null,
): FocusScrollTarget | null {
  if (!focusTerm?.trim()) return null;
  const paragraphIndex = paragraphIndexForTerm(paragraphs, focusTerm);
  const span = course ? findConceptSpan(course, focusTerm) : undefined;
  if (paragraphIndex < 0 && !span) return null;
  return {
    paragraphIndex: paragraphIndex >= 0 ? paragraphIndex : 0,
    charStart: span?.charStart,
    charEnd: span?.charEnd,
    sentence: span?.sentence,
  };
}

/** Pick the best concept label from concept bus / weak-area list for navigation. */
export function pickFocusNavigationTerm(
  candidates: string[],
  preferred?: string,
): string | undefined {
  if (preferred && candidates.some((c) => termMatchesFocus(c, preferred))) return preferred;
  return candidates[0];
}
