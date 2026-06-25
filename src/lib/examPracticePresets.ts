/**
 * Wave 6.3 — Shared exam-practice presets linking Simulator scenarios ↔ Timer blocks.
 */

import type { Lang } from './i18n';
import type { TimerPresetKey } from './timerSessionModel';

export type SimulatorScenarioId = 'baseline' | 'demand-boom' | 'supply-shock' | 'recession';

export type ExamPracticePresetId =
  | 'sprint-drill'
  | 'section-focus'
  | 'full-exam-block'
  | 'scenario-shock';

export type SimulatorScenarioPreset = {
  id: SimulatorScenarioId;
  i18nKey: 'presetBaseline' | 'presetDemandBoom' | 'presetSupplyShock' | 'presetRecession';
  demand: number;
  supply: number;
  examPracticePresetId: ExamPracticePresetId;
};

export type ExamPracticePreset = {
  id: ExamPracticePresetId;
  labelEn: string;
  labelEl: string;
  workMinutes: number;
  timerPresetKey: TimerPresetKey;
  simulatorScenarioId?: SimulatorScenarioId;
};

export const SIMULATOR_SCENARIO_PRESETS: SimulatorScenarioPreset[] = [
  { id: 'baseline', i18nKey: 'presetBaseline', demand: 0, supply: 0, examPracticePresetId: 'section-focus' },
  { id: 'demand-boom', i18nKey: 'presetDemandBoom', demand: 25, supply: 0, examPracticePresetId: 'scenario-shock' },
  { id: 'supply-shock', i18nKey: 'presetSupplyShock', demand: 0, supply: 25, examPracticePresetId: 'scenario-shock' },
  { id: 'recession', i18nKey: 'presetRecession', demand: -20, supply: 10, examPracticePresetId: 'full-exam-block' },
];

export const EXAM_PRACTICE_PRESETS: ExamPracticePreset[] = [
  {
    id: 'sprint-drill',
    labelEn: 'Sprint drill · 15 min',
    labelEl: 'Sprint · 15′',
    workMinutes: 15,
    timerPresetKey: 'sprint10',
  },
  {
    id: 'section-focus',
    labelEn: 'Section focus · 30 min',
    labelEl: 'Ενότητα · 30′',
    workMinutes: 30,
    timerPresetKey: 'focus25',
  },
  {
    id: 'full-exam-block',
    labelEn: 'Full exam block · 60 min',
    labelEl: 'Πλήρες block · 60′',
    workMinutes: 60,
    timerPresetKey: 'deep50',
  },
  {
    id: 'scenario-shock',
    labelEn: 'Scenario under pressure · 20 min',
    labelEl: 'Σενάριο υπό πίεση · 20′',
    workMinutes: 20,
    timerPresetKey: 'sprint10',
    simulatorScenarioId: 'demand-boom',
  },
];

export function getExamPracticePreset(id: ExamPracticePresetId): ExamPracticePreset {
  return EXAM_PRACTICE_PRESETS.find((p) => p.id === id) ?? EXAM_PRACTICE_PRESETS[1]!;
}

export function getSimulatorScenarioPreset(id: SimulatorScenarioId): SimulatorScenarioPreset {
  return SIMULATOR_SCENARIO_PRESETS.find((p) => p.id === id) ?? SIMULATOR_SCENARIO_PRESETS[0]!;
}

export function examPracticePresetForScenario(scenarioId: SimulatorScenarioId): ExamPracticePresetId {
  return getSimulatorScenarioPreset(scenarioId).examPracticePresetId;
}

export function timerPresetForExamPractice(presetId: ExamPracticePresetId): TimerPresetKey {
  return getExamPracticePreset(presetId).timerPresetKey;
}

export function workSecondsForExamPractice(presetId: ExamPracticePresetId): number {
  return getExamPracticePreset(presetId).workMinutes * 60;
}

export function examPracticeLabel(presetId: ExamPracticePresetId, lang: Lang): string {
  const p = getExamPracticePreset(presetId);
  return lang === 'el' ? p.labelEl : p.labelEn;
}

export function daysUntilExam(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - Date.now()) / 86_400_000));
}

/** Suggest timed exam block from mastery, exam proximity, and last simulator scenario. */
export function suggestExamPracticePreset(opts: {
  conceptMastery: number;
  daysToExam?: number | null;
  lastSimulatorScenario?: SimulatorScenarioId | null;
  simulatorEngaged?: boolean;
}): ExamPracticePresetId {
  const { conceptMastery, daysToExam = null, lastSimulatorScenario, simulatorEngaged } = opts;

  if (simulatorEngaged && lastSimulatorScenario) {
    return examPracticePresetForScenario(lastSimulatorScenario);
  }

  if (daysToExam !== null && daysToExam <= 7) {
    return conceptMastery >= 60 ? 'full-exam-block' : 'scenario-shock';
  }

  if (conceptMastery < 40) return 'sprint-drill';
  if (conceptMastery >= 75) return 'full-exam-block';
  return 'section-focus';
}

export function suggestExamPracticeFromTimerPreset(timerKey: TimerPresetKey): ExamPracticePresetId {
  if (timerKey === 'sprint10') return 'sprint-drill';
  if (timerKey === 'deep50') return 'full-exam-block';
  return 'section-focus';
}
