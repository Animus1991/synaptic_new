import { describe, it, expect } from 'vitest';

import { buildTopicMasteryHeatmap } from './topicMasteryHeatmap';

describe('buildTopicMasteryHeatmap', () => {
  it('aggregates average score per assignment topic', () => {
    const hm = buildTopicMasteryHeatmap(
      'cls-1',
      'Physics',
      [
        { id: 'a1', classId: 'cls-1', title: 'Thermodynamics', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'a2', classId: 'cls-1', title: 'Optics', createdAt: '2026-01-02T00:00:00Z' },
      ],
      {
        classId: 'cls-1',
        cells: [
          { enrollmentId: 'e1', assignmentId: 'a1', status: 'graded', score: 80, updatedAt: '' },
          { enrollmentId: 'e2', assignmentId: 'a1', status: 'graded', score: 60, updatedAt: '' },
          { enrollmentId: 'e1', assignmentId: 'a2', status: 'graded', score: 90, updatedAt: '' },
        ],
      },
    );
    expect(hm.topics).toHaveLength(2);
    expect(hm.topics[0]!.avgScore).toBe(70);
    expect(hm.topics[1]!.avgScore).toBe(90);
    expect(hm.topics[0]!.masteryLevel).toBeCloseTo(0.7);
  });
});
