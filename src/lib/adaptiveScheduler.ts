/**
 * FSRS-6 adaptive scheduler (ts-fsrs 5.x). Replaces SM-2-lite interval heuristics.
 */
import { FSRS, Rating, State, createEmptyCard, type Card, type Grade } from 'ts-fsrs';
import type { SpacingData } from '../types';
import type { FsrsRating } from './pedagogy';

export const FSRS_ALGORITHM_VERSION = 'FSRS-6' as const;
export const FSRS_CONFIGURATION = {
  requestRetention: 0.9,
  enableShortTerm: true,
  enableFuzz: false,
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
} as const;

const fsrs = new FSRS({
  request_retention: FSRS_CONFIGURATION.requestRetention,
  enable_short_term: FSRS_CONFIGURATION.enableShortTerm,
  enable_fuzz: FSRS_CONFIGURATION.enableFuzz,
  learning_steps: [...FSRS_CONFIGURATION.learningSteps],
  relearning_steps: [...FSRS_CONFIGURATION.relearningSteps],
});
const DAY_MS = 86_400_000;

const RATING_MAP: Record<FsrsRating, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function inferredLastReview(spacing: SpacingData, fallback: Date): Date {
  const dueMs = new Date(spacing.nextReview).getTime();
  const intervalDays = Number.isFinite(spacing.interval) ? Math.max(0, spacing.interval) : 0;
  const inferredMs = dueMs - intervalDays * DAY_MS;
  return Number.isFinite(inferredMs) ? new Date(inferredMs) : fallback;
}

function validDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function validState(value: number): value is State {
  return value === State.New
    || value === State.Learning
    || value === State.Review
    || value === State.Relearning;
}

function spacingToCard(spacing: SpacingData, now: Date): Card {
  const persisted = spacing.fsrsCard;
  const persistedDue = validDate(persisted?.due);
  const persistedLastReview = validDate(persisted?.lastReview);
  if (
    persisted
    && persisted.algorithmVersion === FSRS_ALGORITHM_VERSION
    && persistedDue
    && validState(persisted.state)
  ) {
    return {
      due: persistedDue,
      stability: Math.max(0, spacing.stability),
      difficulty: Math.min(10, Math.max(1, spacing.difficulty * 10 || 5)),
      elapsed_days: persistedLastReview
        ? Math.max(0, (now.getTime() - persistedLastReview.getTime()) / DAY_MS)
        : 0,
      scheduled_days: Math.max(0, persisted.scheduledDays),
      learning_steps: Math.max(0, persisted.learningSteps),
      reps: Math.max(0, persisted.reps),
      lapses: Math.max(0, persisted.lapses),
      state: persisted.state,
      last_review: persistedLastReview ?? undefined,
    };
  }

  // Legacy compatibility: historical rows did not persist the full Card.
  // `due - interval` is the best recoverable approximation of last review.
  const due = new Date(spacing.nextReview);
  const safeDue = Number.isFinite(due.getTime()) ? due : now;
  const lastReview = inferredLastReview(spacing, now);
  const elapsedDays = Math.max(0, (now.getTime() - lastReview.getTime()) / DAY_MS);
  return {
    due: safeDue,
    stability: Math.max(0.1, spacing.stability),
    difficulty: Math.min(10, Math.max(1, spacing.difficulty * 10 || 5)),
    elapsed_days: elapsedDays,
    scheduled_days: Math.max(0, spacing.interval),
    learning_steps: 0,
    reps: spacing.reviewCount,
    lapses: 0,
    state: spacing.reviewCount <= 1 ? State.Learning : State.Review,
    last_review: spacing.reviewCount > 0 ? lastReview : undefined,
  };
}

export type FsrsScheduleResult = {
  interval: number;
  nextReview: string;
  stability: number;
  difficulty: number;
  reviewCount: number;
  fsrsCard: NonNullable<SpacingData['fsrsCard']>;
};

/** Schedule the next review with FSRS-6 from prior spacing state (or a new card). */
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
  const lastReview = graded.card.last_review instanceof Date
    ? graded.card.last_review
    : graded.card.last_review
      ? new Date(graded.card.last_review)
      : undefined;
  // Keep sub-day learning steps intact instead of coercing 1m/10m to one day.
  const intervalDays = Math.max(0, (due.getTime() - now.getTime()) / DAY_MS);

  return {
    interval: intervalDays,
    nextReview: due.toISOString(),
    stability: graded.card.stability,
    difficulty: graded.card.difficulty / 10,
    reviewCount: graded.card.reps,
    fsrsCard: {
      algorithmVersion: FSRS_ALGORITHM_VERSION,
      due: due.toISOString(),
      lastReview: lastReview && Number.isFinite(lastReview.getTime())
        ? lastReview.toISOString()
        : undefined,
      state: graded.card.state,
      scheduledDays: graded.card.scheduled_days,
      learningSteps: graded.card.learning_steps,
      reps: graded.card.reps,
      lapses: graded.card.lapses,
    },
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
    fsrsCard: scheduled.fsrsCard,
  };
}

function spacingToRetrievabilityCard(spacing: SpacingData, now: Date): Card {
  return spacingToCard(spacing, now);
}

/** FSRS-6 retrievability (0–1) for a spaced concept. */
export function fsrsRetrievability(spacing: SpacingData, now: Date = new Date()): number {
  if (spacing.reviewCount <= 0) return 1;
  const card = spacingToRetrievabilityCard(spacing, now);
  const r = fsrs.get_retrievability(card, now, false);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
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
  const active = spacingIntervals.filter((spacing) =>
    spacing.reviewCount > 0
    && Number.isFinite(new Date(spacing.nextReview).getTime())
    && Number.isFinite(spacing.stability)
    && spacing.stability > 0,
  );
  if (active.length === 0) return [];

  const points: RetentionForecastPoint[] = [];
  for (let d = 0; d <= horizonDays; d++) {
    const at = new Date(now.getTime() + d * DAY_MS);
    let sum = 0;
    let n = 0;
    let dueCount = 0;
    for (const s of active) {
      sum += fsrsRetrievability(s, at);
      n += 1;
      if (new Date(s.nextReview).getTime() <= at.getTime()) dueCount += 1;
    }
    points.push({
      dayOffset: d,
      avgRetrievability: n > 0 ? sum / n : 0,
      dueCount,
    });
  }
  return points;
}

export function summarizeRetentionForecast(spacingIntervals: SpacingData[], now = new Date()): {
  avgRetrievabilityToday: number;
  dueNext7Days: number;
  overdueNow: number;
  trackedConcepts: number;
} {
  const active = spacingIntervals.filter((s) =>
    s.reviewCount > 0
    && Number.isFinite(new Date(s.nextReview).getTime())
    && Number.isFinite(s.stability)
    && s.stability > 0,
  );
  const avgRetrievabilityToday = active.length > 0
    ? active.reduce((sum, s) => sum + fsrsRetrievability(s, now), 0) / active.length
    : 0;
  const weekEnd = new Date(now.getTime() + 7 * DAY_MS);
  const overdueNow = active.filter((s) => new Date(s.nextReview).getTime() < now.getTime()).length;
  const dueNext7Days = active.filter((s) => {
    const dueMs = new Date(s.nextReview).getTime();
    return dueMs >= now.getTime() && dueMs <= weekEnd.getTime();
  }).length;
  return {
    avgRetrievabilityToday,
    dueNext7Days,
    overdueNow,
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
