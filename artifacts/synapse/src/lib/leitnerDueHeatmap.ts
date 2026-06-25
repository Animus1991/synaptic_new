import type { SpacingData } from '../types';
import { conceptRelevanceScore } from './noteContentExtractors';

export type HeatmapDay = {
  dayOffset: number;
  label: string;
  dueCount: number;
  intensity: number;
};

const DAY_LABELS_EN = ['Today', 'T+1', 'T+2', 'T+3', 'T+4', 'T+5', 'T+6'];
const DAY_LABELS_EL = ['Σήμερα', 'T+1', 'T+2', 'T+3', 'T+4', 'T+5', 'T+6'];

/**
 * 7-day due-queue heatmap from FSRS spacing intervals (correlation with learner model).
 */
export function buildDueHeatmap(
  spacingIntervals: SpacingData[],
  concept: string,
  days = 7,
  now = new Date(),
  lang: 'en' | 'el' = 'en',
): HeatmapDay[] {
  const labels = lang === 'el' ? DAY_LABELS_EL : DAY_LABELS_EN;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: days }, (_, i) => ({
    dayOffset: i,
    label: labels[i] ?? `T+${i}`,
    dueCount: 0,
    intensity: 0,
  }));

  for (const s of spacingIntervals) {
    if (conceptRelevanceScore(s.concept, concept) < 0.15
      && !s.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 5))) continue;

    const review = new Date(s.nextReview);
    const dayOffset = Math.floor((review.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
    if (dayOffset < 0) {
      buckets[0]!.dueCount += 1;
    } else if (dayOffset < days) {
      buckets[dayOffset]!.dueCount += 1;
    }
  }

  const max = Math.max(1, ...buckets.map((b) => b.dueCount));
  for (const b of buckets) {
    b.intensity = b.dueCount / max;
  }
  return buckets;
}
