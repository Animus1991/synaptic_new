import { describe, expect, it } from 'vitest';
import { createManualTask } from './personalTask';
import { buildTaskIcs, escapeIcsText, foldIcsLine, taskIcsFilename } from './taskIcs';

const course = { id: 'c1', title: 'Microeconomics', color: '#818cf8', icon: '📊' };

describe('task ICS export', () => {
  it('escapes TEXT and folds long lines', () => {
    expect(escapeIcsText('A; B, C\\D\nE')).toBe('A\\; B\\, C\\\\D\\nE');
    const folded = foldIcsLine(`SUMMARY:${'x'.repeat(90)}`);
    expect(folded.split('\r\n')[0]!.length).toBe(75);
    expect(folded).toContain('\r\n ');
  });

  it('builds an all-day event from a date-only dueAt', () => {
    const task = createManualTask({
      title: 'Review elasticity',
      description: 'Chapter 4; demand, supply',
      course,
      category: 'exam',
      priority: 'high',
      estimatedMinutes: 45,
      dueAt: '2026-09-01',
    });
    const ics = buildTaskIcs(task, new Date('2026-08-15T12:00:00.000Z'));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain(`UID:synapse-task-${task.id}@synapse.local`);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260901');
    expect(ics).toContain('DTEND;VALUE=DATE:20260902');
    expect(ics).toContain('SUMMARY:Review elasticity');
    expect(ics).toContain('DESCRIPTION:Chapter 4\\; demand\\, supply\\nMicroeconomics');
    expect(taskIcsFilename(task)).toBe('review-elasticity.ics');
  });

  it('uses a timed window when dueAt is a datetime', () => {
    const task = createManualTask({
      title: 'Mock exam',
      course,
      category: 'exam',
      priority: 'medium',
      estimatedMinutes: 30,
      dueAt: '2026-09-01T14:00:00.000Z',
    });
    const ics = buildTaskIcs(task, new Date('2026-08-15T12:00:00.000Z'));
    expect(ics).toContain('DTSTART:20260901T140000Z');
    expect(ics).toContain('DTEND:20260901T143000Z');
  });
});
