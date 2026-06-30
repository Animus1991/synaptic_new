/**
 * FSRS-4 adaptive scheduler (ts-fsrs). Replaces SM-2-lite interval heuristics.
 */
import { FSRS, Rating, State, createEmptyCard, type Card, type Grade } from 'ts-fsrs';
import type { SpacingData } from '../types';
import type { FsrsRating } from './pedagogy';

const fsrs = new FSRS({});

const RATING_MAP: Record<FsrsRating, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function spacingToCard(spacing: SpacingData, now: Date): Card {
  return {
    due: new Date(spacing.nextReview),
    stability: Math.max(0.1, spacing.stability),
    difficulty: Math.min(10, Math.max(1, spacing.difficulty * 10 || 5)),
    elapsed_days: 0,
    scheduled_days: spacing.interval,
    learning_steps: 0,
    reps: spacing.reviewCount,
    lapses: 0,
    state: spacing.reviewCount <= 1 ? State.Learning : State.Review,
    last_review: spacing.reviewCount > 0 ? now : undefined,
  };
}

export type FsrsScheduleResult = {
  interval: number;
  nextReview: string;
  stability: number;
  difficulty: number;
  reviewCount: number;
};

/** Schedule next review with FSRS-4 from prior spacing state (or new card). */
export function scheduleFsrsReview(
  spacing: SpacingData | undefined,
  _concept: string,
  rating: FsrsRating,
  now: Date = new Date(),
): FsrsScheduleResult {
  const card =
    spacing && spacing.reviewCount > 0
      ? spacingToCard(spacing, now)
      : createEmptyCard(now);

  const graded = fsrs.next(card, now, RATING_MAP[rating] as Grade);
  const due = graded.card.due instanceof Date ? graded.card.due : new Date(graded.card.due);
  const intervalDays = Math.max(
    1,
    Math.round((due.getTime() - now.getTime()) / 86_400_000),
  );

  return {
    interval: intervalDays,
    nextReview: due.toISOString(),
    stability: graded.card.stability,
    difficulty: graded.card.difficulty / 10,
    reviewCount: (spacing?.reviewCount ?? 0) + 1,
  };
}

/** Build or update a SpacingData row after an FSRS rating. */
export function applyFsrsToSpacing(
  spacing: SpacingData | undefined,
  concept: string,
  rating: FsrsRating,
  now: Date = new Date(),
): SpacingData {
  const scheduled = scheduleFsrsReview(spacing, concept, rating, now);
  return {
    concept,
    interval: scheduled.interval,
    nextReview: scheduled.nextReview,
    stability: scheduled.stability,
    difficulty: scheduled.difficulty,
    reviewCount: scheduled.reviewCount,
  };
}
