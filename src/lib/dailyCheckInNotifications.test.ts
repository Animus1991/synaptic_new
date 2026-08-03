import { describe, expect, it, beforeEach } from 'vitest';
import { buildDailyCheckInAlert, maybeDailyCheckInReminder } from './dailyCheckInNotifications';
import {
  applyCheckInPatch,
  emptyCheckIn,
  markGreetingSent,
  saveDailyCheckIn,
} from './dailyLearningCheckIn';

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  const api = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => { map.clear(); },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() { return map.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: api, configurable: true });
}

describe('dailyCheckInNotifications', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it('builds an alert when required slots are missing', () => {
    const record = emptyCheckIn('2026-07-31');
    const alert = buildDailyCheckInAlert('el', record);
    expect(alert?.kind).toBe('daily-checkin');
    expect(alert?.action.type).toBe('agent');
    expect(alert?.message).toMatch(/chat/i);
  });

  it('returns null when check-in is complete', () => {
    let record = markGreetingSent(emptyCheckIn('2026-07-31'));
    record = applyCheckInPatch(record, {
      energy: 'ok',
      availableMinutes: 25,
      sessionIntent: 'learn',
      focusCourseId: 'c1',
      focusCourseTitle: 'Micro',
      confidence: 3,
    });
    saveDailyCheckIn(record);
    expect(buildDailyCheckInAlert('en', record)).toBeNull();
  });

  it('fires at most one reminder per day unless forced', () => {
    const record = emptyCheckIn('2026-07-31');
    saveDailyCheckIn(record);
    const first = maybeDailyCheckInReminder('en', { record, force: true });
    expect(first).toBeTruthy();
    const second = maybeDailyCheckInReminder('en', { record });
    expect(second).toBeNull();
    const forced = maybeDailyCheckInReminder('en', { record, force: true });
    expect(forced).toBeTruthy();
  });
});
