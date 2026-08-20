import type {
  ActivityItem,
  ConfidencePoint,
  Course,
  LearnerModel,
  SpacingData,
} from '../../types';
import type { LearningEvent } from '../../lib/learningEvents';
import { FSRS_ALGORITHM_VERSION, FSRS_CONFIGURATION } from '../../lib/adaptiveScheduler';
import { CONTENT_PIPELINE_VERSION } from '../../lib/pipelineConstants';
import {
  retentionCurveFromActivities,
  retentionEvidenceFromActivities,
} from './retentionAnalytics';
import {
  rangeCutoffMs,
  type AnalyticsDateRange,
} from './analyticsDateRange';

export type ConceptPerformance = {
  concept: string;
  /** Observed correctness rate. Kept as an alias for export compatibility. */
  pLearned: number;
  observedAccuracy: number;
  attempts: number;
  correct: number;
};

/** @deprecated This is descriptive concept performance, not a BKT posterior. */
export type BktConceptParams = ConceptPerformance;

export type ResearchMetrics = {
  brierScore: number | null;
  expectedCalibrationError: number | null;
  calibrationSampleSize: number;
  calibrationBinCount: number;
  /** Legacy normalized interval score (mean interval / 14, capped at 1). */
  spacingDensity: number | null;
  meanSpacingIntervalDays: number | null;
  spacingSampleSize: number;
  interleavingRatio: number | null;
  interleavingConceptEvents: number;
  interleavingTransitions: number;
  bktConcepts: BktConceptParams[];
  forgettingCurve: { day: number; retention: number }[];
  retentionSampleSize: number;
  sampleActivities: number;
  sampleEvents: number;
};

export const RESEARCH_EXPORT_SCHEMA_VERSION = '1.1.0' as const;
export const RESEARCH_METRICS_VERSION = '2026-08-20' as const;
const CALIBRATION_BIN_COUNT = 10;

function validConfidencePoints(points: ConfidencePoint[]): ConfidencePoint[] {
  return points.filter((point) =>
    Number.isFinite(point.predicted)
    && Number.isFinite(point.actual)
    && point.predicted >= 0
    && point.predicted <= 1
    && point.actual >= 0
    && point.actual <= 1,
  );
}

function computeBrierScore(points: ConfidencePoint[]): number | null {
  if (points.length === 0) return null;
  const sum = points.reduce((s, p) => s + (p.predicted - p.actual) ** 2, 0);
  return sum / points.length;
}

/**
 * Standard equal-width expected calibration error.
 * Each bin contributes its sample-weighted |mean confidence − mean outcome|.
 */
function computeEce(points: ConfidencePoint[]): number | null {
  if (points.length === 0) return null;
  const bins = Array.from({ length: CALIBRATION_BIN_COUNT }, () => ({
    count: 0,
    confidenceSum: 0,
    outcomeSum: 0,
  }));
  for (const point of points) {
    const index = Math.min(
      CALIBRATION_BIN_COUNT - 1,
      Math.floor(point.predicted * CALIBRATION_BIN_COUNT),
    );
    const bin = bins[index]!;
    bin.count += 1;
    bin.confidenceSum += point.predicted;
    bin.outcomeSum += point.actual;
  }
  return bins.reduce((total, bin) => {
    if (bin.count === 0) return total;
    const meanConfidence = bin.confidenceSum / bin.count;
    const meanOutcome = bin.outcomeSum / bin.count;
    return total + (bin.count / points.length) * Math.abs(meanConfidence - meanOutcome);
  }, 0);
}

function nonEmptyCalibrationBins(points: ConfidencePoint[]): number {
  return new Set(points.map((point) => Math.min(
    CALIBRATION_BIN_COUNT - 1,
    Math.floor(point.predicted * CALIBRATION_BIN_COUNT),
  ))).size;
}

function conceptPerformanceFromEvents(events: LearningEvent[]): ConceptPerformance[] {
  const byConcept = new Map<string, { correct: number; total: number }>();
  for (const e of events) {
    if (e.type !== 'quiz_attempted' || !e.concept || typeof e.payload?.correct !== 'boolean') continue;
    const row = byConcept.get(e.concept) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (e.payload?.correct === true) row.correct += 1;
    byConcept.set(e.concept, row);
  }
  return [...byConcept.entries()]
    .map(([concept, { correct, total }]) => {
      const observedAccuracy = total > 0 ? correct / total : 0;
      return { concept, pLearned: observedAccuracy, observedAccuracy, attempts: total, correct };
    })
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 12);
}

function conceptPerformanceFromActivities(activities: ActivityItem[]): ConceptPerformance[] {
  const byConcept = new Map<string, { correct: number; total: number }>();
  for (const act of activities) {
    if (act.type !== 'quiz_passed' && act.type !== 'quiz_failed') continue;
    const m = act.description.match(/(?:on|quiz on)\s+(.+?)(?:\s*\(|$)/i);
    const concept = m?.[1]?.trim();
    if (!concept) continue;
    const row = byConcept.get(concept) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (act.type === 'quiz_passed') row.correct += 1;
    byConcept.set(concept, row);
  }
  return [...byConcept.entries()]
    .map(([concept, { correct, total }]) => {
      const observedAccuracy = total > 0 ? correct / total : 0;
      return { concept, pLearned: observedAccuracy, observedAccuracy, attempts: total, correct };
    })
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 12);
}

function summarizeSpacing(model: LearnerModel): {
  density: number | null;
  meanIntervalDays: number | null;
  sampleSize: number;
} {
  const intervals = model.spacingIntervals
    .filter((spacing) => spacing.reviewCount > 0 && Number.isFinite(spacing.interval) && spacing.interval > 0)
    .map((spacing) => spacing.interval);
  if (intervals.length === 0) {
    return { density: null, meanIntervalDays: null, sampleSize: 0 };
  }
  const meanIntervalDays = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  return {
    density: Math.min(1, meanIntervalDays / 14),
    meanIntervalDays,
    sampleSize: intervals.length,
  };
}

function activityConcept(activity: ActivityItem): string | null {
  if (activity.type === 'quiz_passed' || activity.type === 'quiz_failed') {
    return activity.description.match(/quiz on\s+(.+?)(?:\s*\(|$)/i)?.[1]?.trim() ?? null;
  }
  if (activity.type === 'review_done') {
    return activity.description.match(/(?:Reviewed|Leitner):\s*(.+?)(?:\s*\(|$)/i)?.[1]?.trim() ?? null;
  }
  return null;
}

function summarizeInterleaving(
  activities: ActivityItem[],
  events: LearningEvent[],
): { ratio: number | null; conceptEvents: number; transitions: number } {
  const structuredConcepts = events
    .filter((event) => event.type === 'quiz_attempted' && event.concept?.trim())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((event) => event.concept!.trim().toLocaleLowerCase());
  const activityConcepts = activities
    .map((activity) => ({
      concept: activityConcept(activity),
      timestamp: new Date(activity.timestamp).getTime(),
    }))
    .filter((row): row is { concept: string; timestamp: number } =>
      Boolean(row.concept) && Number.isFinite(row.timestamp),
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((row) => row.concept.toLocaleLowerCase());
  const concepts = structuredConcepts.length >= 2 ? structuredConcepts : activityConcepts;
  if (concepts.length < 2) {
    return { ratio: null, conceptEvents: concepts.length, transitions: 0 };
  }
  let switches = 0;
  for (let i = 1; i < concepts.length; i++) {
    if (concepts[i] !== concepts[i - 1]) switches += 1;
  }
  return {
    ratio: switches / (concepts.length - 1),
    conceptEvents: concepts.length,
    transitions: concepts.length - 1,
  };
}

export function computeResearchMetrics(
  model: LearnerModel,
  activities: ActivityItem[],
  events: LearningEvent[],
): ResearchMetrics {
  const fromEvents = conceptPerformanceFromEvents(events);
  const fromActs = conceptPerformanceFromActivities(activities);
  const bktConcepts = fromEvents.length > 0 ? fromEvents : fromActs;
  const confidencePoints = validConfidencePoints(model.confidenceCalibration);
  const spacing = summarizeSpacing(model);
  const interleaving = summarizeInterleaving(activities, events);
  const retentionSampleSize = retentionEvidenceFromActivities(activities).eligibleEvents;

  return {
    brierScore: computeBrierScore(confidencePoints),
    expectedCalibrationError: computeEce(confidencePoints),
    calibrationSampleSize: confidencePoints.length,
    calibrationBinCount: nonEmptyCalibrationBins(confidencePoints),
    spacingDensity: spacing.density,
    meanSpacingIntervalDays: spacing.meanIntervalDays,
    spacingSampleSize: spacing.sampleSize,
    interleavingRatio: interleaving.ratio,
    interleavingConceptEvents: interleaving.conceptEvents,
    interleavingTransitions: interleaving.transitions,
    bktConcepts,
    forgettingCurve: retentionCurveFromActivities(activities),
    retentionSampleSize,
    sampleActivities: activities.length,
    sampleEvents: events.length,
  };
}

export type ResearchExportManifest = {
  schemaVersion: typeof RESEARCH_EXPORT_SCHEMA_VERSION;
  metricDefinitionsVersion: typeof RESEARCH_METRICS_VERSION;
  exportedAt: string;
  pipelineVersion: string;
  fsrsVersion: string;
  fsrsConfiguration: typeof FSRS_CONFIGURATION;
  scope: {
    dateRange: AnalyticsDateRange | 'unspecified';
    startAt: string | null;
    endAt: string;
    schedulingMetrics: 'current-model-snapshot';
  };
  learnerSnapshot: {
    overallMastery: number;
    retentionRate: number;
    transferAbility: number;
    helpSeekingRate: number;
    persistenceScore: number;
    bestTimeOfDay: string;
    cognitiveLoadPreference: string;
  };
  metrics: ResearchMetrics;
  metricInputs: {
    confidenceCalibration: ConfidencePoint[];
    spacingIntervals: SpacingData[];
  };
  activities: ActivityItem[];
  events: LearningEvent[];
  courses: { id: string; title: string; mastery: number }[];
};

export function buildResearchExport(
  model: LearnerModel,
  activities: ActivityItem[],
  events: LearningEvent[],
  courses: Course[],
  options: { range?: AnalyticsDateRange; now?: Date } = {},
): ResearchExportManifest {
  const now = options.now ?? new Date();
  const exportedAt = now.toISOString();
  return {
    schemaVersion: RESEARCH_EXPORT_SCHEMA_VERSION,
    metricDefinitionsVersion: RESEARCH_METRICS_VERSION,
    exportedAt,
    pipelineVersion: CONTENT_PIPELINE_VERSION,
    fsrsVersion: FSRS_ALGORITHM_VERSION,
    fsrsConfiguration: FSRS_CONFIGURATION,
    scope: {
      dateRange: options.range ?? 'unspecified',
      startAt: options.range
        ? new Date(rangeCutoffMs(options.range, now.getTime())).toISOString()
        : null,
      endAt: exportedAt,
      schedulingMetrics: 'current-model-snapshot',
    },
    learnerSnapshot: {
      overallMastery: model.overallMastery,
      retentionRate: model.retentionRate,
      transferAbility: model.transferAbility,
      helpSeekingRate: model.helpSeekingRate,
      persistenceScore: model.persistenceScore,
      bestTimeOfDay: model.bestTimeOfDay,
      cognitiveLoadPreference: model.cognitiveLoadPreference,
    },
    metrics: computeResearchMetrics(model, activities, events),
    metricInputs: {
      confidenceCalibration: [...model.confidenceCalibration],
      spacingIntervals: [...model.spacingIntervals],
    },
    activities,
    events,
    courses: courses
      .filter((c) => c.status !== 'generating')
      .map((c) => ({ id: c.id, title: c.title, mastery: c.mastery })),
  };
}

export function downloadResearchExport(manifest: ResearchExportManifest, filename?: string): void {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `synapse-research-${manifest.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
