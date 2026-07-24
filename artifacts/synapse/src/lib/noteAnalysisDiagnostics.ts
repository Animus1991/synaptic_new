import type { Course } from '../types';
import type { Lang } from './i18n';

export type DiagnosticCount =
  | { kind: 'known'; value: number }
  | { kind: 'zero' }
  | { kind: 'unknown' };

export type NoteAnalysisAction = 'upload' | 'workspace' | 'course' | 'reprocess';

export type MaterialProcessingReadiness = {
  score: number | null;
  status: 'ready' | 'limited' | 'insufficient';
  inputs: string[];
  explanation: string;
};

export type TruthfulQaMetric = {
  id: string;
  label: string;
  score: number | null;
  detail: string;
  invert?: boolean;
  available: boolean;
};

export type NoteAnalysisSummary = {
  sourceHealth: string;
  sourceHealthDetail: string;
  structure: string;
  structureDetail: string;
  nextStep: string;
  nextStepAction: NoteAnalysisAction;
};

const MIN_WORDS_FOR_READINESS = 80;

export function resolveDiagnosticCount(
  raw: number | undefined,
  metricsAvailable: boolean,
): DiagnosticCount {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw === 0 ? { kind: 'zero' } : { kind: 'known', value: raw };
  }
  if (metricsAvailable) return { kind: 'zero' };
  return { kind: 'unknown' };
}

export function formatDiagnosticCount(count: DiagnosticCount, lang: Lang): string {
  if (count.kind === 'known') return String(count.value);
  if (count.kind === 'zero') return '0';
  return lang === 'el' ? 'Άγνωστο' : 'Unknown';
}

export function computeMaterialProcessingReadiness(
  course: Course,
  wordCount: number,
  hasExtractedText: boolean,
  lang: Lang,
): MaterialProcessingReadiness {
  const sq = course.sourceQuality?.score;

  if (!hasExtractedText || wordCount < MIN_WORDS_FOR_READINESS) {
    return {
      score: null,
      status: 'insufficient',
      inputs: [
        lang === 'el'
          ? `Εξαγόμενες λέξεις: ${wordCount} (ελάχιστο ${MIN_WORDS_FOR_READINESS})`
          : `Extracted words: ${wordCount} (minimum ${MIN_WORDS_FOR_READINESS})`,
      ],
      explanation: lang === 'el'
        ? 'Δεν υπάρχει αρκετό αναγνώσιμο κείμενο για αξιόπιστο material processing readiness.'
        : 'Not enough readable source text for a reliable material processing readiness score.',
    };
  }

  if (sq == null) {
    return {
      score: null,
      status: 'insufficient',
      inputs: [
        lang === 'el' ? 'Ποιότητα πηγής: δεν υπολογίστηκε' : 'Source quality: not computed',
        lang === 'el' ? `Λέξεις: ${wordCount}` : `Words: ${wordCount}`,
      ],
      explanation: lang === 'el'
        ? 'Το readiness εμφανίζεται μόνο όταν υπάρχει πραγματικό source quality score από το pipeline.'
        : 'Readiness is shown only when the pipeline produced a real source quality score.',
    };
  }

  const inputs = [
    lang === 'el' ? `Ποιότητα πηγής: ${sq}/100` : `Source quality: ${sq}/100`,
    lang === 'el' ? `Λέξεις: ${wordCount}` : `Words: ${wordCount}`,
    lang === 'el'
      ? `Θέματα / έννοιες: ${course.topics.length} / ${course.conceptCount || '—'}`
      : `Topics / concepts: ${course.topics.length} / ${course.conceptCount || '—'}`,
  ];

  let score = sq;
  if (wordCount < 400) score = Math.min(score, 58);
  if (course.sourceQuality?.needsMoreMaterial) score = Math.min(score, 52);

  const status: MaterialProcessingReadiness['status'] =
    score >= 65 ? 'ready' : score >= 40 ? 'limited' : 'insufficient';

  return {
    score,
    status,
    inputs,
    explanation: lang === 'el'
      ? 'Material processing readiness = heuristic από ποιότητα πηγής, όγκο λέξεων και πυκνότητα θεμάτων. Δεν είναι exam readiness.'
      : 'Material processing readiness = heuristic from source quality, word volume, and topic density. This is not exam readiness.',
  };
}

export function buildTruthfulQaMetrics(
  course: Course,
  graphNodeCount: number,
  lang: Lang,
): TruthfulQaMetric[] {
  const sq = course.sourceQuality?.score ?? null;
  const pedagogical = course.qualityReport?.overallScore ?? null;
  const groundedSpanCount = course.conceptSpans?.length ?? 0;

  const metrics: TruthfulQaMetric[] = [];

  if (sq != null) {
    metrics.push({
      id: 'source-coverage',
      label: lang === 'el' ? 'Κάλυψη πηγής' : 'Source coverage',
      score: sq,
      detail: lang === 'el'
        ? `${sq}/100 από το pipeline source quality`
        : `${sq}/100 from pipeline source quality`,
      available: true,
    });
    metrics.push({
      id: 'hallucination-risk',
      label: lang === 'el' ? 'Κίνδυνος αβάσιμων ισχυρισμών' : 'Ungrounded claim risk',
      score: Math.max(2, Math.round((100 - sq) / 8)),
      detail: lang === 'el'
        ? 'Εκτίμηση από source quality — όχι πλήρης fact-check.'
        : 'Estimate from source quality — not full fact-checking.',
      invert: true,
      available: true,
    });
  }

  if (pedagogical != null) {
    metrics.push({
      id: 'pedagogical',
      label: lang === 'el' ? 'Παιδαγωγική ποιότητα' : 'Pedagogical quality',
      score: pedagogical,
      detail: lang === 'el'
        ? 'Από automated course quality rubric'
        : 'From automated course quality rubric',
      available: true,
    });
  }

  if (course.conceptCount > 0 && graphNodeCount > 0) {
    metrics.push({
      id: 'concept-coverage',
      label: lang === 'el' ? 'Κάλυψη εννοιών στο γράφημα' : 'Concept graph coverage',
      score: Math.min(100, Math.round((graphNodeCount / course.conceptCount) * 100)),
      detail: lang === 'el'
        ? `${graphNodeCount} κόμβοι / ${course.conceptCount} εξαγόμενες έννοιες`
        : `${graphNodeCount} graph nodes / ${course.conceptCount} extracted concepts`,
      available: true,
    });
  }

  if (groundedSpanCount > 0) {
    metrics.push({
      id: 'grounded-spans',
      label: lang === 'el' ? 'Source-grounded spans' : 'Source-grounded spans',
      score: null,
      detail: lang === 'el'
        ? `${groundedSpanCount} concept spans συνδεδεμένα με αποσπάσματα πηγής (όχι citation interactions)`
        : `${groundedSpanCount} concept spans linked to source excerpts (not citation interaction counts)`,
      available: true,
    });
  }

  return metrics;
}

export function pickRecommendedNextStep(
  course: Course,
  issueActions: NoteAnalysisAction[],
  lang: Lang,
): Pick<NoteAnalysisSummary, 'nextStep' | 'nextStepAction'> {
  if (issueActions.includes('upload') || course.sourceQuality?.needsMoreMaterial) {
    return {
      nextStep: lang === 'el'
        ? 'Ανέβασε επιπλέον σημειώσεις ή slides για πιο γειωμένο course.'
        : 'Upload additional notes or slides for a more grounded course.',
      nextStepAction: 'upload',
    };
  }
  if (issueActions.includes('reprocess')) {
    return {
      nextStep: lang === 'el'
        ? 'Επανεπεξεργάσου το υλικό μετά από διορθώσεις στις πηγές.'
        : 'Reprocess material after fixing or extending sources.',
      nextStepAction: 'reprocess',
    };
  }
  if (course.sourceQuality?.score != null && course.sourceQuality.score >= 65) {
    return {
      nextStep: lang === 'el'
        ? 'Άνοιξε το workspace για μελέτη με citations στο reader.'
        : 'Open the workspace to study with reader citations.',
      nextStepAction: 'workspace',
    };
  }
  return {
    nextStep: lang === 'el'
      ? 'Δες το course overview για outline, θέματα και επόμενα βήματα.'
      : 'Review the course overview for outline, topics, and next steps.',
    nextStepAction: 'course',
  };
}

export function buildNoteAnalysisSummary(
  course: Course,
  readiness: MaterialProcessingReadiness,
  wordCount: number,
  topicCount: number,
  issueActions: NoteAnalysisAction[],
  lang: Lang,
): NoteAnalysisSummary {
  const sq = course.sourceQuality?.score;
  const band = course.sourceQuality?.band;

  let sourceHealth: string;
  let sourceHealthDetail: string;
  if (sq == null) {
    sourceHealth = lang === 'el' ? 'Ανεπαρκή δεδομένα πηγής' : 'Insufficient source data';
    sourceHealthDetail = lang === 'el'
      ? 'Δεν υπάρχει pipeline source quality score για αυτό το course.'
      : 'No pipeline source quality score is available for this course.';
  } else if (band === 'weak' || readiness.status === 'insufficient') {
    sourceHealth = lang === 'el' ? 'Αδύναμη πηγή' : 'Weak source signal';
    sourceHealthDetail = lang === 'el'
      ? `Ποιότητα πηγής ${sq}/100 — χρειάζεται περισσότερο υλικό πριν βαθιά μελέτη.`
      : `Source quality ${sq}/100 — add material before deep study.`;
  } else if (band === 'moderate' || readiness.status === 'limited') {
    sourceHealth = lang === 'el' ? 'Μέτρια πηγή' : 'Moderate source signal';
    sourceHealthDetail = lang === 'el'
      ? `Ποιότητα πηγής ${sq}/100 — usable, αλλά με gaps.`
      : `Source quality ${sq}/100 — usable with gaps.`;
  } else {
    sourceHealth = lang === 'el' ? 'Υγιής πηγή' : 'Healthy source signal';
    sourceHealthDetail = lang === 'el'
      ? `Ποιότητα πηγής ${sq}/100 — καλή βάση για μελέτη.`
      : `Source quality ${sq}/100 — solid base for study.`;
  }

  const structure = lang === 'el'
    ? `${topicCount} θέματα · ${wordCount.toLocaleString()} λέξεις`
    : `${topicCount} topics · ${wordCount.toLocaleString()} words`;
  const structureDetail = lang === 'el'
    ? `${course.conceptCount || '—'} έννοιες · ${course.topics.reduce((n, t) => n + (t.lessons.length || 0), 0)} lessons`
    : `${course.conceptCount || '—'} concepts · ${course.topics.reduce((n, t) => n + (t.lessons.length || 0), 0)} lessons`;

  const { nextStep, nextStepAction } = pickRecommendedNextStep(course, issueActions, lang);

  return { sourceHealth, sourceHealthDetail, structure, structureDetail, nextStep, nextStepAction };
}
