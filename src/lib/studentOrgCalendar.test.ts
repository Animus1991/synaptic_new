import { describe, it, expect } from 'vitest';
import { EXAM_CALENDAR_FEED } from './examPrep/examCalendarFeed';
import { mergeStudentOrgCalendar } from './studentOrgCalendar';

const resolveExam = (entry: (typeof EXAM_CALENDAR_FEED)[number]) => ({
  title: entry.titleKey,
  body: entry.bodyKey,
  linkLabel: entry.linkLabelKey,
});

describe('mergeStudentOrgCalendar', () => {
  it('merges assignment due dates with exam feed sorted by date', () => {
    const rows = mergeStudentOrgCalendar(
      [
        {
          assignmentId: 'a1',
          classId: 'c1',
          className: 'Bio',
          title: 'Lab report',
          dueAt: '2026-06-01T12:00:00.000Z',
          status: 'pending',
        },
      ],
      EXAM_CALENDAR_FEED,
      resolveExam,
      'all',
      Date.parse('2026-05-01'),
    );
    expect(rows.some((r) => r.kind === 'assignment' && r.title === 'Lab report')).toBe(true);
    expect(rows.some((r) => r.kind === 'exam')).toBe(true);
    for (let i = 1; i < rows.length; i += 1) {
      expect(Date.parse(rows[i]!.date)).toBeGreaterThanOrEqual(Date.parse(rows[i - 1]!.date));
    }
  });

  it('filters assignments-only', () => {
    const rows = mergeStudentOrgCalendar(
      [
        {
          assignmentId: 'a1',
          classId: 'c1',
          className: 'Bio',
          title: 'Quiz',
          dueAt: '2026-06-01',
          status: 'overdue',
        },
      ],
      EXAM_CALENDAR_FEED,
      resolveExam,
      'assignments',
      Date.parse('2026-05-01'),
    );
    expect(rows.every((r) => r.kind === 'assignment')).toBe(true);
  });
});
