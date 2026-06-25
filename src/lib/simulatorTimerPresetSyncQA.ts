/**
 * Wave 6.8j — QA spine for Simulator ↔ Timer exam preset sync.
 */

import type { Lang } from './i18n';
import type { TimerPresetKey } from './timerSessionModel';
import {
  EXAM_PRACTICE_PRESETS,
  SIMULATOR_SCENARIO_PRESETS,
  examPracticePresetForScenario,
  getExamPracticePreset,
  timerPresetForExamPractice,
  type ExamPracticePresetId,
  type SimulatorScenarioId,
} from './examPracticePresets';
import { loadExamPracticePreset, loadLastSimulatorScenario } from './workspacePersistence';

export type SimulatorTimerSyncIssue = {
  code: 'scenario-unmapped' | 'preset-timer-gap' | 'persist-drift' | 'missing-scenario-link';
  message: string;
};

export type SimulatorTimerPresetSyncReport = {
  ok: boolean;
  scenarioCount: number;
  linkedTimerPreset: TimerPresetKey;
  suggestedExamPractice: ExamPracticePresetId;
  lastSimulatorScenario: SimulatorScenarioId | null;
  savedExamPractice: ExamPracticePresetId | null;
  syncOk: boolean;
  issues: SimulatorTimerSyncIssue[];
  bannerSummary: string | null;
};

const ALL_SCENARIOS: SimulatorScenarioId[] = ['baseline', 'demand-boom', 'supply-shock', 'recession'];

export function resolveLinkedTimerPreset(examPracticeId: ExamPracticePresetId): TimerPresetKey {
  return timerPresetForExamPractice(examPracticeId);
}

export function resolveSimulatorExamPractice(
  scopeKey: string,
  fallback: ExamPracticePresetId,
): ExamPracticePresetId {
  const saved = loadExamPracticePreset(scopeKey) as ExamPracticePresetId | null;
  if (saved) return saved;
  const scenario = loadLastSimulatorScenario(scopeKey) as SimulatorScenarioId | null;
  if (scenario) return examPracticePresetForScenario(scenario);
  return fallback;
}

export function verifyScenarioPresetMatrix(): SimulatorTimerSyncIssue[] {
  const issues: SimulatorTimerSyncIssue[] = [];
  for (const scenario of ALL_SCENARIOS) {
    const presetId = examPracticePresetForScenario(scenario);
    const preset = getExamPracticePreset(presetId);
    if (!preset.timerPresetKey) {
      issues.push({
        code: 'preset-timer-gap',
        message: `Scenario ${scenario} → ${presetId} lacks timer preset key`,
      });
    }
    if (!SIMULATOR_SCENARIO_PRESETS.some((s) => s.id === scenario)) {
      issues.push({ code: 'scenario-unmapped', message: `Scenario ${scenario} missing from presets` });
    }
  }
  for (const preset of EXAM_PRACTICE_PRESETS) {
    if (preset.simulatorScenarioId && !ALL_SCENARIOS.includes(preset.simulatorScenarioId)) {
      issues.push({
        code: 'missing-scenario-link',
        message: `Exam preset ${preset.id} references unknown scenario`,
      });
    }
  }
  return issues;
}

export function auditSimulatorTimerPresetSync(input: {
  scopeKey: string;
  suggestedExamPractice: ExamPracticePresetId;
  lang: Lang;
}): SimulatorTimerPresetSyncReport {
  const issues = verifyScenarioPresetMatrix();
  const savedExamPractice = loadExamPracticePreset(input.scopeKey) as ExamPracticePresetId | null;
  const lastSimulatorScenario = loadLastSimulatorScenario(input.scopeKey) as SimulatorScenarioId | null;

  const effectiveExamPractice = savedExamPractice ?? input.suggestedExamPractice;
  const linkedTimerPreset = resolveLinkedTimerPreset(effectiveExamPractice);

  if (lastSimulatorScenario) {
    const expected = examPracticePresetForScenario(lastSimulatorScenario);
    if (savedExamPractice && savedExamPractice !== expected) {
      issues.push({
        code: 'persist-drift',
        message: `Saved exam preset ${savedExamPractice} differs from scenario ${lastSimulatorScenario} → ${expected}`,
      });
    }
  }

  const syncOk = !issues.some((i) => i.code === 'persist-drift' || i.code === 'preset-timer-gap');

  return {
    ok: issues.length === 0,
    scenarioCount: SIMULATOR_SCENARIO_PRESETS.length,
    linkedTimerPreset,
    suggestedExamPractice: effectiveExamPractice,
    lastSimulatorScenario,
    savedExamPractice,
    syncOk,
    issues,
    bannerSummary: formatSimulatorTimerSyncBanner({
      linkedTimerPreset,
      examPractice: effectiveExamPractice,
      scenario: lastSimulatorScenario,
      lang: input.lang,
    }),
  };
}

export function formatSimulatorTimerSyncBanner(input: {
  linkedTimerPreset: TimerPresetKey;
  examPractice: ExamPracticePresetId;
  scenario: SimulatorScenarioId | null;
  lang: Lang;
}): string | null {
  const isEl = input.lang === 'el';
  const parts = [
    isEl ? `Timer · ${input.linkedTimerPreset}` : `Timer · ${input.linkedTimerPreset}`,
    input.examPractice,
  ];
  if (input.scenario) {
    parts.push(isEl ? `σενάριο ${input.scenario}` : `scenario ${input.scenario}`);
  }
  return parts.join(' · ');
}
