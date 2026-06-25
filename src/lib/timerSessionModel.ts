/**
 * Timer session view-model — session label, preset suggestion, and UI metadata
 * for the workspace Timer tool.
 */

import type { Lang } from './i18n';
import {
  loadExamTarget,
  loadExamPracticePreset,
  loadLastSimulatorScenario,
  loadTimerSessions,
  type TimerSessionLog,
} from './workspacePersistence';
import { isGenericStudyConcept } from './workspaceContentFallback';
import {
  daysUntilExam,
  suggestExamPracticePreset,
  timerPresetForExamPractice,
  type ExamPracticePresetId,
  type SimulatorScenarioId,
} from './examPracticePresets';
import { syncExamTargetFromDashboard } from './timerExamCountdownDashboardQA';

export type TimerPresetKey = 'focus25' | 'sprint10' | 'deep50';

export type TimerSessionContent = {
  sessionLabel: string;
  sectionLabel?: string;
  suggestedPreset: TimerPresetKey;
  suggestedExamPractice: ExamPracticePresetId;
  examTargetIso: string | null;
  daysToExam: number | null;
  lastSimulatorScenario: string | null;
  recentSessionCount: number;
  weakExtraction: boolean;
  passageGrounded: boolean;
  hasSource: boolean;
  suggestBreakTool: 'leitner' | null;
};

export function buildTimerSessionLabel(
  concept: string,
  stepLabel: string | undefined,
  stepIndex: number | undefined,
  lang: Lang,
): string {
  const stepPart = stepLabel
    ? (stepIndex !== undefined
      ? `${lang === 'el' ? 'Βήμα' : 'Step'} ${stepIndex + 1}: ${stepLabel}`
      : stepLabel)
    : (lang === 'el' ? 'Εστίαση' : 'Focus');
  return concept ? `${concept} · ${stepPart}` : stepPart;
}

export function suggestTimerPreset(conceptMastery: number): TimerPresetKey {
  if (conceptMastery < 40) return 'sprint10';
  if (conceptMastery >= 75) return 'deep50';
  return 'focus25';
}

export function filterTimerSessionLogs(logs: TimerSessionLog[], query: string): TimerSessionLog[] {
  const q = query.trim().toLowerCase();
  if (!q) return logs;
  return logs.filter((log) => log.label.toLowerCase().includes(q));
}

export function buildTimerSessionContent(opts: {
  concept: string;
  stepLabel?: string;
  stepIndex?: number;
  sectionLabel?: string;
  lang: Lang;
  hasSource: boolean;
  conceptMastery: number;
  scopeKey: string;
  leitnerDueCount?: number;
  settingsExamDate?: string | null;
  courseExamDate?: string | null;
}): TimerSessionContent {
  const {
    concept,
    stepLabel,
    stepIndex,
    sectionLabel,
    lang,
    hasSource,
    conceptMastery,
    scopeKey,
    leitnerDueCount = 0,
    settingsExamDate,
    courseExamDate,
  } = opts;

  if (!hasSource) {
    return {
      sessionLabel: buildTimerSessionLabel(concept, stepLabel, stepIndex, lang),
      sectionLabel,
      suggestedPreset: 'focus25',
      suggestedExamPractice: 'section-focus',
      examTargetIso: null,
      daysToExam: null,
      lastSimulatorScenario: null,
      recentSessionCount: 0,
      weakExtraction: true,
      passageGrounded: false,
      hasSource: false,
      suggestBreakTool: null,
    };
  }

  const generic = isGenericStudyConcept(concept);
  const recentSessionCount = loadTimerSessions(scopeKey).length;
  syncExamTargetFromDashboard({ scopeKey, settingsExamDate, courseExamDate });
  const examTargetIso = loadExamTarget(scopeKey);
  const daysToExamVal = daysUntilExam(examTargetIso);
  const lastSimulatorScenario = loadLastSimulatorScenario(scopeKey) as SimulatorScenarioId | null;
  const savedExamPractice = loadExamPracticePreset(scopeKey) as ExamPracticePresetId | null;
  const suggestedExamPractice = savedExamPractice ?? suggestExamPracticePreset({
    conceptMastery,
    daysToExam: daysToExamVal,
    lastSimulatorScenario,
  });

  return {
    sessionLabel: buildTimerSessionLabel(concept, stepLabel, stepIndex, lang),
    sectionLabel,
    suggestedPreset: timerPresetForExamPractice(suggestedExamPractice),
    suggestedExamPractice,
    examTargetIso,
    daysToExam: daysToExamVal,
    lastSimulatorScenario,
    recentSessionCount,
    weakExtraction: generic,
    passageGrounded: generic,
    hasSource: true,
    suggestBreakTool: leitnerDueCount > 0 ? 'leitner' : null,
  };
}
