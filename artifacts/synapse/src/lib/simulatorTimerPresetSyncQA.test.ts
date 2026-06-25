import { describe, expect, it } from 'vitest';
import {
  auditSimulatorTimerPresetSync,
  resolveLinkedTimerPreset,
  resolveSimulatorExamPractice,
  verifyScenarioPresetMatrix,
} from './simulatorTimerPresetSyncQA';
import { examPracticePresetForScenario } from './examPracticePresets';

describe('simulatorTimerPresetSyncQA', () => {
  it('maps every simulator scenario to a timer-linked exam preset', () => {
    expect(verifyScenarioPresetMatrix()).toHaveLength(0);
    expect(examPracticePresetForScenario('supply-shock')).toBe('scenario-shock');
    expect(resolveLinkedTimerPreset('scenario-shock')).toBe('sprint10');
  });

  it('audits sync report for scope with scenario', () => {
    const report = auditSimulatorTimerPresetSync({
      scopeKey: 'test-scope',
      suggestedExamPractice: 'section-focus',
      lang: 'en',
    });
    expect(report.scenarioCount).toBe(4);
    expect(report.linkedTimerPreset).toBeTruthy();
    expect(report.bannerSummary).toContain('Timer');
  });

  it('resolves exam practice from saved scenario fallback', () => {
    const resolved = resolveSimulatorExamPractice('missing-key', 'sprint-drill');
    expect(resolved).toBe('sprint-drill');
  });
});
