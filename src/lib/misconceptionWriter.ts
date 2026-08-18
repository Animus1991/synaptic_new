/**
 * Heuristic misconception writer — turns first-attempt quiz/exam misses into
 * LearnerModel.misconceptions so Dashboard "Mark as corrected" works outside demo.
 */

import type { Misconception } from '../types';
import { conceptsMatch } from './adaptiveGapRouting';

export type MisconceptionSource = 'quiz' | 'exam' | 'practice';

export const MAX_TRACKED_MISCONCEPTIONS = 12;

type WriterInput = {
  concept: string;
  confidence: number;
  source?: MisconceptionSource;
  lang?: 'en' | 'el';
  now?: string;
};

function normConcept(concept: string): string {
  return concept.trim().toLowerCase();
}

export function misconceptionIdForConcept(concept: string): string {
  return `misc:${normConcept(concept).replace(/\s+/g, '-')}`;
}

function copyFor(input: WriterInput): Pick<Misconception, 'description' | 'suggestedFix' | 'relatedErrors'> {
  const concept = input.concept.trim() || 'this concept';
  const source = input.source ?? 'quiz';
  const highConfidence = input.confidence >= 70;
  const el = input.lang === 'el';

  if (source === 'exam') {
    return {
      description: el
        ? `Λάθος σε ερώτηση εξέτασης για «${concept}».`
        : `Missed ${concept} on an exam-style question.`,
      suggestedFix: el
        ? `Ξαναδές το «${concept}» με timed ερώτηση και σύγκρινέ το με το πλησιέστερο θέμα.`
        : `Review ${concept} with a timed question and contrast it with the nearest related idea.`,
      relatedErrors: ['exam-application', highConfidence ? 'overconfidence' : 'recall'],
    };
  }

  if (source === 'practice') {
    return {
      description: el
        ? `Λάθος στην εξάσκηση για «${concept}».`
        : `Missed ${concept} during practice.`,
      suggestedFix: el
        ? `Κάνε δύο σύντομες ερωτήσεις ανάκλησης για το «${concept}».`
        : `Try two short retrieval questions on ${concept}.`,
      relatedErrors: ['practice-miss', highConfidence ? 'conceptual' : 'recall'],
    };
  }

  if (highConfidence) {
    return {
      description: el
        ? `Απάντησες με υψηλή σιγουριά αλλά έκανες λάθος στο «${concept}» — πιθανή σύγχυση με κοντινή έννοια.`
        : `Answered with high confidence but missed ${concept} — likely mixing it up with a nearby idea.`,
      suggestedFix: el
        ? `Σύγκρινε το «${concept}» με την πλησιέστερη έννοια και ξανακάνε ένα σύντομο quiz.`
        : `Compare ${concept} with the closest related idea, then retry a short quiz.`,
      relatedErrors: ['conceptual', 'overconfidence'],
    };
  }

  return {
    description: el
      ? `Λάθος στην πρώτη προσπάθεια quiz για «${concept}» — η έννοια δεν είναι ακόμα σταθερή.`
      : `Missed ${concept} on a first-attempt quiz — the idea is not stable yet.`,
    suggestedFix: el
      ? `Διάβασε τον πυρήνα του «${concept}» και δοκίμασε δύο ερωτήσεις ανάκλησης.`
      : `Review the core definition of ${concept} and try two retrieval questions.`,
    relatedErrors: ['recall'],
  };
}

function mergeRelated(prev: string[], next: string[]): string[] {
  return [...new Set([...prev, ...next])].slice(0, 6);
}

/** Upsert an uncorrected misconception from a first-attempt miss. Correct answers are a no-op. */
export function applyQuizMisconception(
  existing: Misconception[],
  input: WriterInput & { correct?: boolean },
): Misconception[] {
  if (input.correct) return existing;
  const concept = input.concept.trim();
  if (!concept) return existing;

  const now = input.now ?? new Date().toISOString();
  const copy = copyFor({ ...input, concept });
  const matchIdx = existing.findIndex((m) => conceptsMatch(m.concept, concept));

  if (matchIdx >= 0) {
    const prev = existing[matchIdx]!;
    const updated: Misconception = {
      ...prev,
      concept: prev.concept,
      description: copy.description,
      suggestedFix: copy.suggestedFix,
      relatedErrors: mergeRelated(prev.relatedErrors, copy.relatedErrors),
      frequency: prev.frequency + 1,
      corrected: false,
      detectedAt: prev.corrected ? now : prev.detectedAt,
    };
    const next = existing.slice();
    next[matchIdx] = updated;
    return next;
  }

  const created: Misconception = {
    id: misconceptionIdForConcept(concept),
    concept,
    description: copy.description,
    frequency: 1,
    corrected: false,
    relatedErrors: copy.relatedErrors,
    suggestedFix: copy.suggestedFix,
    detectedAt: now,
  };
  return [created, ...existing].slice(0, MAX_TRACKED_MISCONCEPTIONS);
}
