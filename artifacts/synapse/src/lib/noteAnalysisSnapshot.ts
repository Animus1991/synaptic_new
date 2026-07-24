/**
 * Builds a structured note-analysis snapshot from real course + file data
 * for the UX-C Note Analysis Pipeline surface.
 */

import type { Course, UploadedFile } from '../types';
import type { Lang } from './i18n';
import {
  buildNoteAnalysisSummary,
  buildTruthfulQaMetrics,
  computeMaterialProcessingReadiness,
  formatDiagnosticCount,
  resolveDiagnosticCount,
  type DiagnosticCount,
  type MaterialProcessingReadiness,
  type NoteAnalysisAction,
  type NoteAnalysisSummary,
  type TruthfulQaMetric,
} from './noteAnalysisDiagnostics';
import {
  extractiveSummary,
  inferSubject,
  rankKeyphrases,
  splitSentences,
} from './contentAnalysis';
import { conceptGraphToCourseVisual } from './courseConceptGraph';
import { getCorpus, retrieve, tokenize } from './rag';

export type NoteAnalysisStageId = 1 | 2 | 2.5 | 3 | 4 | 5;

export type NoteAnalysisIssue = {
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  page?: string;
  recommendation: string;
  action: NoteAnalysisAction;
};

export type Bm25TermRow = {
  term: string;
  tf: number;
  idf: number;
  score: number;
  rank: number;
};

export type TextRankSentence = {
  text: string;
  score: number;
  selected: boolean;
};

export type NoteAnalysisSnapshot = {
  courseTitle: string;
  subject: string;
  sourceQualityScore: number | null;
  readiness: MaterialProcessingReadiness;
  summary: NoteAnalysisSummary;
  capabilities: {
    algorithmTransparency: boolean;
    formulasDetected: boolean;
    qualityReport: boolean;
  };
  fileCount: number;
  pageEstimate: number;
  wordCount: number;
  extractedItems: { label: string; count: DiagnosticCount; displayValue: string }[];
  issues: NoteAnalysisIssue[];
  bm25Terms: Bm25TermRow[];
  textRankSentences: TextRankSentence[];
  keyphrases: { phrase: string; score: number }[];
  graphNodes: ReturnType<typeof conceptGraphToCourseVisual>['nodes'];
  graphEdges: ReturnType<typeof conceptGraphToCourseVisual>['edges'];
  modules: {
    id: string;
    title: string;
    minutes: number;
    lessonCount: number;
    concepts: number;
    lessons: string[];
  }[];
  qaMetrics: TruthfulQaMetric[];
};

function combineCourseText(files: UploadedFile[]): string {
  return files
    .filter((f) => (f.extractedText?.trim().length ?? 0) > 40)
    .map((f) => f.extractedText!.trim())
    .join('\n\n');
}

function estimatePages(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 320));
}

export function buildBm25Table(text: string, files: UploadedFile[], courseId: string): Bm25TermRow[] {
  const corpus = getCorpus(files, courseId);
  const tokens = tokenize(text);
  const tfMap = new Map<string, number>();
  for (const tok of tokens) {
    tfMap.set(tok, (tfMap.get(tok) ?? 0) + 1);
  }
  const totalDocs = Math.max(1, corpus.chunks.length);
  const rows: Bm25TermRow[] = [];
  for (const [term, tf] of tfMap) {
    const df = corpus.docFreq.get(term) ?? 0;
    if (df === 0) continue;
    const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
    const score = tf * idf;
    rows.push({ term, tf, idf: Math.round(idf * 100) / 100, score: Math.round(score * 10) / 10, rank: 0 });
  }
  return rows
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export function buildTextRankSentences(text: string, biasTerms: string[]): TextRankSentence[] {
  const summary = extractiveSummary(text, 3, { biasTerms, capSentences: 80 });
  const summarySet = new Set(summary.map((s) => s.trim()));
  const sentences = splitSentences(text).slice(0, 12);
  const keySet = new Set(biasTerms.flatMap((p) => p.toLowerCase().split(/\s+/)));
  return sentences.map((s) => {
    const words = s.toLowerCase().split(/\s+/);
    const hits = words.filter((w) => keySet.has(w.replace(/[^\p{L}\p{N}]/gu, ''))).length;
    const score = Math.min(0.99, 0.35 + hits * 0.12 + (summarySet.has(s.trim()) ? 0.35 : 0));
    return { text: s, score: Math.round(score * 100) / 100, selected: summarySet.has(s.trim()) };
  }).sort((a, b) => b.score - a.score).slice(0, 7);
}

function issuesFromCourse(course: Course, lang: Lang): NoteAnalysisIssue[] {
  const issues: NoteAnalysisIssue[] = [];
  const sq = course.sourceQuality;
  if (sq?.warnings) {
    for (const w of sq.warnings.slice(0, 4)) {
      issues.push({
        severity: sq.band === 'weak' ? 'warning' : 'info',
        title: lang === 'el' ? 'Προειδοποίηση ποιότητας πηγής' : 'Source quality warning',
        detail: w,
        recommendation: lang === 'el'
          ? 'Πρόσθεσε υλικό ή επανεπεξεργάσου τις πηγές.'
          : 'Add material or reprocess sources.',
        action: sq.needsMoreMaterial ? 'upload' : 'reprocess',
      });
    }
  }
  if (sq?.needsMoreMaterial) {
    issues.push({
      severity: 'warning',
      title: lang === 'el' ? 'Λίγο υλικό' : 'Limited source material',
      detail: lang === 'el'
        ? 'Το κείμενο είναι σύντομο για πλήρες adaptive course — προτείνεται επέκταση ή re-upload.'
        : 'Text is short for a full adaptive course — consider extending or re-uploading.',
      recommendation: lang === 'el' ? 'Ανέβασε επιπλέον σημειώσεις ή slides.' : 'Upload additional notes or slides.',
      action: 'upload',
    });
  }
  const qr = course.qualityReport;
  if (qr?.warnings?.length) {
    for (const w of qr.warnings.slice(0, 2)) {
      issues.push({
        severity: 'warning',
        title: lang === 'el' ? 'Ποιότητα course' : 'Course quality',
        detail: w,
        recommendation: qr.recommendations[0] ?? (lang === 'el' ? 'Δες το course overview.' : 'Review the course overview.'),
        action: 'course',
      });
    }
  }
  return issues.slice(0, 5);
}

export function buildNoteAnalysisSnapshot(
  course: Course,
  files: UploadedFile[],
  lang: Lang,
): NoteAnalysisSnapshot {
  const courseFiles = files.filter((f) => f.courseId === course.id);
  const text = combineCourseText(courseFiles);
  const hasExtractedText = text.trim().length > 0;
  const metrics = course.sourceQuality?.metrics;
  const metricsAvailable = Boolean(metrics);
  const wordCount = metrics?.wordCount ?? text.split(/\s+/).filter(Boolean).length;
  const keyphrases = text.length > 80 ? rankKeyphrases(text, 8).map((k) => ({ phrase: k.phrase, score: Math.round(k.score * 100) / 100 })) : [];
  const biasTerms = keyphrases.map((k) => k.phrase);
  const visual = conceptGraphToCourseVisual(course);
  const issues = issuesFromCourse(course, lang);
  const readiness = computeMaterialProcessingReadiness(course, wordCount, hasExtractedText, lang);
  const summary = buildNoteAnalysisSummary(
    course,
    readiness,
    wordCount,
    course.topics.length,
    issues.map((i) => i.action),
    lang,
  );
  const formulaCount = resolveDiagnosticCount(metrics?.formulaCount, metricsAvailable);
  const extractedItems = [
    { label: lang === 'el' ? 'Έννοιες' : 'Concepts', count: course.conceptCount > 0 ? { kind: 'known' as const, value: course.conceptCount } : { kind: 'unknown' as const } },
    { label: lang === 'el' ? 'Ορισμοί' : 'Definitions', count: resolveDiagnosticCount(metrics?.definitionCount, metricsAvailable) },
    { label: lang === 'el' ? 'Τύποι' : 'Formulas', count: formulaCount },
    { label: lang === 'el' ? 'Παραδείγματα' : 'Worked examples', count: resolveDiagnosticCount(metrics?.workedExampleCount, metricsAvailable) },
    { label: lang === 'el' ? 'Ενότητες' : 'Sections', count: resolveDiagnosticCount(metrics?.sectionCount ?? (course.topics.length > 0 ? course.topics.length : undefined), metricsAvailable || course.topics.length > 0) },
    { label: lang === 'el' ? 'Keyphrases' : 'Keyphrases', count: keyphrases.length > 0 ? { kind: 'known' as const, value: keyphrases.length } : resolveDiagnosticCount(metrics?.keyphraseCount, metricsAvailable) },
  ].map((item) => ({ ...item, displayValue: formatDiagnosticCount(item.count, lang) }));

  const algorithmTransparency = text.length > 80;
  const formulasDetected = formulaCount.kind === 'known' && formulaCount.value > 0;

  return {
    courseTitle: course.title,
    subject: course.subject || (text.length > 40 ? inferSubject(text) : (lang === 'el' ? 'Άγνωστο' : 'Unknown')),
    sourceQualityScore: course.sourceQuality?.score ?? null,
    readiness,
    summary,
    capabilities: {
      algorithmTransparency,
      formulasDetected,
      qualityReport: Boolean(course.qualityReport),
    },
    fileCount: courseFiles.length,
    pageEstimate: estimatePages(wordCount),
    wordCount,
    extractedItems,
    issues,
    bm25Terms: algorithmTransparency ? buildBm25Table(text, courseFiles, course.id) : [],
    textRankSentences: algorithmTransparency ? buildTextRankSentences(text, biasTerms) : [],
    keyphrases,
    graphNodes: visual.nodes,
    graphEdges: visual.edges,
    modules: course.topics.map((t) => ({
      id: t.id,
      title: t.title,
      minutes: t.estimatedMinutes,
      lessonCount: t.lessons.length || Math.max(2, Math.ceil((t.keyConcepts?.length ?? t.conceptCount) / 2)),
      concepts: t.conceptCount || t.keyConcepts?.length || 0,
      lessons: t.lessons.length > 0
        ? t.lessons.map((l) => l.title)
        : (t.keyConcepts?.slice(0, 4) ?? [t.title]),
    })),
    qaMetrics: buildTruthfulQaMetrics(course, visual.nodes.length, lang),
  };
}

/** Top BM25 hits for a concept query — used in transparency panel demos. */
export function retrieveTransparencyHits(
  files: UploadedFile[],
  courseId: string,
  query: string,
  k = 4,
) {
  const corpus = getCorpus(files, courseId);
  return retrieve(query, corpus, k);
}

export function buildLiveTransparencyData(
  files: UploadedFile[],
  courseId: string,
  query: string,
  k = 4,
) {
  const courseFiles = files.filter((f) => f.courseId === courseId);
  const text = combineCourseText(courseFiles);
  const keyphrases = rankKeyphrases(text, 8).map((k) => ({ phrase: k.phrase, score: Math.round(k.score * 100) / 100 }));
  const biasTerms = query.trim()
    ? [query, ...keyphrases.map((k) => k.phrase).slice(0, 4)]
    : keyphrases.map((k) => k.phrase);

  return {
    wordCount: text.split(/\s+/).filter(Boolean).length,
    bm25Terms: text.length > 80 ? buildBm25Table(text, courseFiles, courseId) : [],
    textRankSentences: text.length > 80 ? buildTextRankSentences(text, biasTerms) : [],
    keyphrases,
    hits: query.trim() ? retrieveTransparencyHits(courseFiles, courseId, query, k) : [],
  };
}
