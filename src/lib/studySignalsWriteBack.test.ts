import { describe, expect, it } from 'vitest';
import {
  buildChatConsistencyInsight,
  tasksFilterFromSignals,
} from './studySignalsWriteBack';

describe('studySignalsWriteBack', () => {
  it('maps intent to tasks filter', () => {
    expect(tasksFilterFromSignals({ sessionIntent: 'review' })).toBe('review');
    expect(tasksFilterFromSignals({ sessionIntent: 'exam' })).toBe('exam');
    expect(tasksFilterFromSignals({ sessionIntent: 'learn' })).toBeNull();
  });

  it('builds rolling chat insight for dashboard', () => {
    const insights = buildChatConsistencyInsight(
      ['older'],
      { energy: 'low', availableMinutes: 20, sessionIntent: 'review', focusCourseTitle: 'Micro' },
      'el',
    );
    expect(insights[0]).toMatch(/Chat σήμερα/);
    expect(insights[0]).toMatch(/20′/);
    expect(insights).toContain('older');
  });
});
