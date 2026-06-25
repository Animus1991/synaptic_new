/**
 * Wave 6.8l έΑΦ QA spine for Feynman rubric export discoverability.
 * Ensures learners can find HTML/PDF export once rubric is ready and that
 * discoverability guides + progress mirror stay aligned.
 */

import type { Lang } from './i18n';
import type { RubricScores } from './feynmanRubric';
import { buildToolFeatureGuide } from './workspaceDiscoverability';

export const FEYNMAN_RUBRIC_MIN_WORDS = 8;

export type FeynmanRubricExportIssue = {
  code:
    | 'draft-too-short'
    | 'export-locked'
    | 'coach-export-gap'
    | 'discoverability-guide-gap';
  message: string;
};

export type FeynmanRubricExportDiscoverabilityReport = {
  ok: boolean;
  draftWordCount: number;
  rubricReady: boolean;
  exportReady: boolean;
  coachEnhancesExport: boolean;
  discoverabilityGuideMentionsExport: boolean;
  overallScore: number | null;
  wordsUntilRubric: number;
  issues: FeynmanRubricExportIssue[];
  bannerSummary: string | null;
};

export function feynmanDraftWordCount(draft: string): number {
  return draft.trim().split(/\s+/).filter(Boolean).length;
}

export function feynmanRubricOverallScore(scores: RubricScores): number {
  const dims = Object.values(scores);
  if (dims.length === 0) return 0;
  return Math.round(dims.reduce((sum, v) => sum + v, 0) / dims.length);
}

export function feynmanDiscoverabilityGuideHasExport(): boolean {
  const features = buildToolFeatureGuide('feynman', 'en').features.join(' ').toLowerCase();
  return features.includes('rubric') && features.includes('export');
}

export function auditFeynmanRubricExportDiscoverability(input: {
  draft: string;
  rubricReady: boolean;
  scores?: RubricScores | null;
  hasCoachFeedback: boolean;
  lang: Lang;
}): FeynmanRubricExportDiscoverabilityReport {
  const issues: FeynmanRubricExportIssue[] = [];
  const draftWordCount = feynmanDraftWordCount(input.draft);
  const wordsUntilRubric = Math.max(0, FEYNMAN_RUBRIC_MIN_WORDS - draftWordCount);
  const rubricReady = input.rubricReady && draftWordCount >= FEYNMAN_RUBRIC_MIN_WORDS;
  const exportReady = rubricReady;
  const discoverabilityGuideMentionsExport = feynmanDiscoverabilityGuideHasExport();

  if (rubricReady && !exportReady) {
    issues.push({
      code: 'export-locked',
      message: 'Rubric computed but export affordances remain locked',
    });
  }

  if (!discoverabilityGuideMentionsExport) {
    issues.push({
      code: 'discoverability-guide-gap',
      message: 'Discoverability guide does not mention rubric export',
    });
  }

  const overallScore = input.scores ? feynmanRubricOverallScore(input.scores) : null;

  return {
    ok: issues.length === 0,
    draftWordCount,
    rubricReady,
    exportReady,
    coachEnhancesExport: input.hasCoachFeedback,
    discoverabilityGuideMentionsExport,
    overallScore,
    wordsUntilRubric,
    issues,
    bannerSummary: formatFeynmanRubricExportBanner({
      lang: input.lang,
      draftWordCount,
      rubricReady,
      exportReady,
      overallScore,
      coachEnhancesExport: input.hasCoachFeedback,
      wordsUntilRubric,
    }),
  };
}

export function formatFeynmanRubricExportBanner(input: {
  lang: Lang;
  draftWordCount: number;
  rubricReady: boolean;
  exportReady: boolean;
  overallScore: number | null;
  coachEnhancesExport: boolean;
  wordsUntilRubric: number;
}): string | null {
  const isEl = input.lang === 'el';

  if (input.draftWordCount === 0) {
    return isEl
      ? '╬Υ╧Β╬υ╧Ι╬╡ ╧Ε╬╖╬╜ ╬╡╬╛╬χ╬│╬╖╧Δ╬χ ╧Δ╬┐╧Ζ έΑΦ ╬╝╬╡╧Ε╬υ ╬╛╬╡╬║╬╗╬╡╬╣╬┤╧Ο╬╜╬╡╧Ε╬▒╬╣ ╬╖ ╬╡╬╛╬▒╬│╧Κ╬│╬χ rubric (HTML/PDF).'
      : 'Write your explanation έΑΦ rubric export (HTML/PDF) unlocks next.';
  }

  if (!input.rubricReady && input.wordsUntilRubric > 0) {
    return isEl
      ? `╬Σ╬║╧Ν╬╝╬▒ ${input.wordsUntilRubric} ╬╗╬φ╬╛${input.wordsUntilRubric === 1 ? '╬╖' : '╬╡╬╣╧Γ'} ╬│╬╣╬▒ rubric + ╬╡╬╛╬▒╬│╧Κ╬│╬χ ╬▒╬╜╬▒╧Η╬┐╧Β╬υ╧Γ.`
      : `${input.wordsUntilRubric} more word${input.wordsUntilRubric === 1 ? '' : 's'} to unlock rubric + report export.`;
  }

  if (input.exportReady && input.overallScore !== null) {
    const scoreNote = isEl
      ? `╬ε╬φ╧Δ╬┐╧Γ ╧Ν╧Β╬┐╧Γ rubric ${input.overallScore}%`
      : `Rubric avg ${input.overallScore}%`;
    const exportNote = isEl
      ? ' ┬╖ ╬Χ╬╛╬▒╬│╧Κ╬│╬χ HTML ╬χ PDF ╧Α╬▒╧Β╬▒╬║╬υ╧Ε╧Κ'
      : ' ┬╖ Export HTML or PDF below';
    const coachNote = input.coachEnhancesExport
      ? (isEl ? ' ┬╖ Coach ╧Δ╧Ζ╬╝╧Α╬╡╧Β╬╣╬╗╬▒╬╝╬▓╬υ╬╜╬╡╧Ε╬▒╬╣' : ' ┬╖ Coach included')
      : (isEl ? ' ┬╖ ╬ι╬υ╧Β╬╡ Coach ╬│╬╣╬▒ ╧Α╬╗╬χ╧Β╬╖ ╬▒╬╜╬▒╧Η╬┐╧Β╬υ' : ' ┬╖ Get Coach for full report');
    return `${scoreNote}${exportNote}${coachNote}`;
  }

  return null;
}
