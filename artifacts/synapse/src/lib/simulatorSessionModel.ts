/**
 * Simulator session view-model — numeric cues, sandbox insight, and UI metadata
 * for the workspace Simulator tool.
 */

import type { Lang } from './i18n';
import type { NumericCue } from './numericCues';
import { extractNumericCues } from './numericCues';
import {
  extractFormulas,
  notesSupportSandbox,
  sandboxInsightFromNotes,
} from './noteContentExtractors';
import { isGenericStudyConcept } from './workspaceContentFallback';
import { loadLastSimulatorScenario } from './workspacePersistence';
import {
  examPracticePresetForScenario,
  suggestExamPracticePreset,
  type ExamPracticePresetId,
  type SimulatorScenarioId,
} from './examPracticePresets';

export type { NumericCue };

export type SimulatorSessionContent = {
  numericCues: NumericCue[];
  sandboxInsight: string;
  economicsMode: boolean;
  sectionLabel?: string;
  weakExtraction: boolean;
  passageGrounded: boolean;
  hasSource: boolean;
  hasActionableContent: boolean;
  lastSimulatorScenario: SimulatorScenarioId | null;
  suggestedExamPractice: ExamPracticePresetId;
};

export function filterNumericCues(cues: NumericCue[], query: string): NumericCue[] {
  const q = query.trim().toLowerCase();
  if (!q) return cues;
  return cues.filter(
    (cue) =>
      cue.label.toLowerCase().includes(q)
      || cue.context.toLowerCase().includes(q),
  );
}

export function buildSimulatorSessionContent(opts: {
  text: string;
  concept: string;
  lang: Lang;
  sectionLabel?: string;
  hasSource: boolean;
  scopeKey?: string;
  conceptMastery?: number;
  daysToExam?: number | null;
}): SimulatorSessionContent {
  const { text, concept, lang, sectionLabel, hasSource, scopeKey, conceptMastery = 50, daysToExam = null } = opts;

  const lastSimulatorScenario = scopeKey
    ? (loadLastSimulatorScenario(scopeKey) as SimulatorScenarioId | null)
    : null;

  if (!hasSource) {
    return {
      numericCues: [],
      sandboxInsight: '',
      economicsMode: false,
      sectionLabel,
      weakExtraction: true,
      passageGrounded: false,
      hasSource: false,
      hasActionableContent: false,
      lastSimulatorScenario,
      suggestedExamPractice: suggestExamPracticePreset({ conceptMastery, daysToExam, lastSimulatorScenario }),
    };
  }

  const formulas = extractFormulas(text, concept);
  const numericCues = extractNumericCues(text, concept);
  const economicsMode = notesSupportSandbox(text, concept, formulas);
  const sandboxInsight = sandboxInsightFromNotes(text, concept, lang);
  const hasActionableContent = numericCues.length > 0 || economicsMode;
  const generic = isGenericStudyConcept(concept);
  const passageGrounded = generic && hasActionableContent;
  const weakExtraction = generic || !hasActionableContent;

  return {
    numericCues,
    sandboxInsight,
    economicsMode,
    sectionLabel,
    weakExtraction,
    passageGrounded,
    hasSource: true,
    hasActionableContent,
    lastSimulatorScenario,
    suggestedExamPractice: lastSimulatorScenario
      ? examPracticePresetForScenario(lastSimulatorScenario)
      : suggestExamPracticePreset({ conceptMastery, daysToExam, lastSimulatorScenario }),
  };
}
