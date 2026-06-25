import { describe, expect, it } from 'vitest';
import { dashboardSubtitle, greetingForTime } from './greeting';

describe('greetingForTime', () => {
  it('returns morning greeting in English', () => {
    expect(greetingForTime('en', new Date('2026-06-23T09:00:00'))).toBe('Good morning');
  });

  it('returns evening greeting in Greek', () => {
    expect(greetingForTime('el', new Date('2026-06-23T20:00:00'))).toBe('Καλό βράδυ');
  });
});

describe('dashboardSubtitle', () => {
  it('mentions critical tasks when present', () => {
    expect(dashboardSubtitle('en', 2, 5)).toContain('2');
    expect(dashboardSubtitle('en', 2, 5)).toContain('5');
  });

  it('shows caught-up copy when no critical tasks', () => {
    expect(dashboardSubtitle('el', 0, 3)).toContain('ορμή');
  });
});
