import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTimerSessionContent,
  buildTimerSessionLabel,
  filterTimerSessionLogs,
  suggestTimerPreset,
} from './timerSessionModel';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  });
});

describe('timerSessionModel', () => {
  it('builds generic-concept session metadata', () => {
    const session = buildTimerSessionContent({
      concept: 'Introduction',
      stepLabel: 'Knowledge Check',
      stepIndex: 7,
      sectionLabel: 'Ricardo trade theory',
      lang: 'en',
      hasSource: true,
      conceptMastery: 30,
      scopeKey: 'scope-intro',
      leitnerDueCount: 3,
    });

    expect(session.passageGrounded).toBe(true);
    expect(session.weakExtraction).toBe(true);
    expect(session.suggestedPreset).toBe('sprint10');
    expect(session.suggestBreakTool).toBe('leitner');
    expect(session.sessionLabel).toContain('Introduction');
  });

  it('returns empty session when no source uploaded', () => {
    const session = buildTimerSessionContent({
      concept: 'Elasticity',
      lang: 'en',
      hasSource: false,
      conceptMastery: 50,
      scopeKey: 'scope-empty',
    });

    expect(session.hasSource).toBe(false);
    expect(session.weakExtraction).toBe(true);
    expect(session.recentSessionCount).toBe(0);
  });

  it('suggests presets by mastery and filters session logs', () => {
    expect(suggestTimerPreset(20)).toBe('sprint10');
    expect(suggestTimerPreset(50)).toBe('focus25');
    expect(suggestTimerPreset(90)).toBe('deep50');

    const logs = [
      { at: '2026-01-01T10:00:00.000Z', minutes: 25, label: 'Introduction · Step 1', preset: 'focus25' as const },
      { at: '2026-01-02T10:00:00.000Z', minutes: 10, label: 'Elasticity · Focus', preset: 'sprint10' as const },
    ];
    expect(filterTimerSessionLogs(logs, 'elasticity')).toHaveLength(1);
    expect(buildTimerSessionLabel('Trade', 'Ricardo', 2, 'el')).toContain('Βήμα 3');
  });
});
