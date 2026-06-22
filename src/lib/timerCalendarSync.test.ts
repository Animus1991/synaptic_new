import { describe, expect, it } from 'vitest';
import { buildExamIcs, buildStudySessionsIcs } from './timerCalendarSync';

describe('timerCalendarSync', () => {
  it('builds valid exam ics', () => {
    const ics = buildExamIcs('2026-12-01T09:00:00.000Z', 'Microeconomics');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('Microeconomics');
  });

  it('builds session events', () => {
    const ics = buildStudySessionsIcs([
      { at: '2026-06-01T10:00:00.000Z', minutes: 25, label: 'Focus', preset: 'focus25' },
    ]);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('Focus');
  });
});
