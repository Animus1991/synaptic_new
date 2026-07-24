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

function spacingToRetrievabilityCard(spacing: SpacingData, now: Date): Card {
  const due = new Date(spacing.nextReview);
  const lastReviewMs = due.getTime() - spacing.interval * 86_400_000;
  const lastReview = spacing.reviewCount > 0 ? new Date(lastReviewMs) : undefined;
  const elapsed_days = lastReview
    ? Math.max(0, (now.getTime() - lastReview.getTime()) / 86_400_000)
    : 0;
  return {
    due,
    stability: Math.max(0.1, spacing.stability),
    difficulty: Math.min(10, Math.max(1, spacing.difficulty * 10 || 5)),
    elapsed_days,
    scheduled_days: spacing.interval,
    learning_steps: 0,
    reps: spacing.reviewCount,
    lapses: 0,
    state: spacing.reviewCount <= 1 ? State.Learning : State.Review,
    last_review: lastReview,
  };
}

/** FSRS-4 retrievability (0–1) for a spaced concept. */
export function fsrsRetrievability(spacing: SpacingData, now: Date = new Date()): number {
  if (spacing.reviewCount <= 0) return 1;
  const card = spacingToRetrievabilityCard(spacing, now);
  const r = fsrs.get_retrievability(card, now, false);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0.85;
}

export type RetentionForecastPoint = {
  dayOffset: number;
  avgRetrievability: number;
  dueCount: number;
};

/** Project average retrievability and due load over the next N days. */
export function buildRetentionForecast(
  spacingIntervals: SpacingData[],
  horizonDays = 14,
  now = new Date(),
): RetentionForecastPoint[] {
  const points: RetentionForecastPoint[] = [];
  for (let d = 0; d <= horizonDays; d++) {
    const at = new Date(now.getTime() + d * 86_400_000);
    let sum = 0;
    let n = 0;
    let dueCount = 0;
    for (const s of spacingIntervals) {
      if (s.reviewCount <= 0) continue;
      sum += fsrsRetrievability(s, at);
      n += 1;
      if (new Date(s.nextReview).getTime() <= at.getTime()) dueCount += 1;
    }
    points.push({
      dayOffset: d,
      avgRetrievability: n > 0 ? sum / n : 1,
      dueCount,
    });
  }
  return points;
}

export function summarizeRetentionForecast(spacingIntervals: SpacingData[], now = new Date()): {
  avgRetrievabilityToday: number;
  dueNext7Days: number;
  trackedConcepts: number;
} {
  const active = spacingIntervals.filter((s) => s.reviewCount > 0);
  const avgRetrievabilityToday = active.length > 0
    ? active.reduce((sum, s) => sum + fsrsRetrievability(s, now), 0) / active.length
    : 1;
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
  const dueNext7Days = active.filter((s) => new Date(s.nextReview).getTime() <= weekEnd.getTime()).length;
  return {
    avgRetrievabilityToday,
    dueNext7Days,
    trackedConcepts: active.length,
  };
}

/** Map quiz outcome to FSRS rating for spacing updates. */
export function quizOutcomeToFsrsRating(correct: boolean, confidence: number): FsrsRating {
  if (!correct) return 'again';
  if (confidence >= 85) return 'easy';
  if (confidence >= 65) return 'good';
  return 'hard';
}
