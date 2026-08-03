import { describe, expect, it } from 'vitest';
import {
  applyCheckInPatch,
  buildSlotPrompt,
  buildWarmGreeting,
  emptyCheckIn,
  isCheckInComplete,
  learnerPatchFromCheckIn,
  missingRequiredSlots,
  nextMissingSlot,
  parseFreeTextForSlot,
  markGreetingSent,
} from './dailyLearningCheckIn';

describe('dailyLearningCheckIn', () => {
  it('starts incomplete with openFeel as next slot', () => {
    const r = emptyCheckIn('2026-07-31');
    expect(isCheckInComplete(r)).toBe(false);
    expect(nextMissingSlot(r)).toBe('openFeel');
    expect(missingRequiredSlots(r)).toEqual([
      'energy',
      'availableMinutes',
      'sessionIntent',
      'focusCourse',
      'confidence',
    ]);
  });

  it('applies chip patches and completes when required slots filled', () => {
    let r = emptyCheckIn('2026-07-31');
    r = markGreetingSent(r);
    r = applyCheckInPatch(r, { energy: 'ok' });
    r = applyCheckInPatch(r, { availableMinutes: 25 });
    r = applyCheckInPatch(r, { sessionIntent: 'review' });
    r = applyCheckInPatch(r, { focusCourseId: 'c1', focusCourseTitle: 'Micro' });
    r = applyCheckInPatch(r, { confidence: 3 });
    expect(isCheckInComplete(r)).toBe(true);
    expect(r.completedAt).toBeTruthy();
    expect(nextMissingSlot(r)).toBe('blocker');
  });

  it('parses Greek free text for minutes and intent', () => {
    const ctx = { lang: 'el' as const, courses: [{ id: 'c1', title: 'Μικροοικονομία' }] };
    expect(parseFreeTextForSlot('availableMinutes', 'έχω 25 λεπτά', ctx)).toEqual({
      availableMinutes: 25,
    });
    expect(parseFreeTextForSlot('sessionIntent', 'θέλω επανάληψη', ctx)).toEqual({
      sessionIntent: 'review',
    });
    expect(parseFreeTextForSlot('focusCourse', 'ας κάνουμε Μικροοικονομία', ctx)).toMatchObject({
      focusCourseId: 'c1',
    });
  });

  it('builds bilingual chips for energy', () => {
    const el = buildSlotPrompt('energy', { lang: 'el', courses: [] });
    expect(el.chips.length).toBe(3);
    expect(el.prompt).toMatch(/ενέργει/i);
    const en = buildSlotPrompt('energy', { lang: 'en', courses: [] });
    expect(en.chips[0]?.patch).toEqual({ energy: 'low' });
  });

  it('warm greeting mentions reviews when due', () => {
    const g = buildWarmGreeting({ lang: 'el', courses: [], reviewDueCount: 4 });
    expect(g).toMatch(/Καλημέρα|Καλό/);
    expect(g).toMatch(/επαναλήψεις/);
  });

  it('learnerPatchFromCheckIn maps minutes and confidence', () => {
    const patch = learnerPatchFromCheckIn({ availableMinutes: 50, confidence: 4 });
    expect(patch.preferredSessionLength).toBe(50);
    expect(patch.averageConfidence).toBe(0.8);
    expect(patch.bestTimeOfDay).toBeTruthy();
  });
});
