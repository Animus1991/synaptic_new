import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '../types';
import { buildStudyBehaviorModel } from './studyBehaviorCharts';

function activity(
  id: string,
  type: ActivityItem['type'],
  description: string,
  timestamp: Date,
): ActivityItem {
  return { id, type, description, timestamp: timestamp.toISOString() };
}

describe('buildStudyBehaviorModel', () => {
  const now = new Date('2026-08-20T12:00:00');

  it('covers each selected range with a stable number of readable buckets', () => {
    expect(buildStudyBehaviorModel([], '7d', 'en', now).dayBars).toHaveLength(7);
    expect(buildStudyBehaviorModel([], '30d', 'en', now).dayBars).toHaveLength(15);
    expect(buildStudyBehaviorModel([], 'semester', 'en', now).dayBars).toHaveLength(13);
  });

  it('represents missing recall evidence as unavailable rather than zero accuracy', () => {
    const model = buildStudyBehaviorModel([
      activity('task', 'task_complete', 'Done', now),
    ], '7d', 'en', now);

    expect(model.effectiveness.at(-1)).toEqual(expect.objectContaining({
      score: null,
      sampleSize: 0,
    }));
  });

  it('uses explicit review ratings and excludes outcome-less legacy reviews', () => {
    const model = buildStudyBehaviorModel([
      activity('again', 'review_done', 'Reviewed: A (again)', now),
      activity('good', 'review_done', 'Reviewed: B (good)', now),
      activity('legacy', 'review_done', 'Legacy review', now),
    ], '7d', 'en', now);

    expect(model.effectiveness.at(-1)).toEqual(expect.objectContaining({
      score: 50,
      sampleSize: 2,
    }));
  });

  it('includes activity from the oldest two-day bucket in the 30-day view', () => {
    const oldest = new Date(now);
    oldest.setDate(oldest.getDate() - 29);
    const model = buildStudyBehaviorModel([
      activity('oldest', 'quiz_passed', 'Passed quiz on A', oldest),
    ], '30d', 'en', now);

    expect(model.dayBars[0]?.count).toBe(1);
    expect(model.dayBars.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
  });
});
