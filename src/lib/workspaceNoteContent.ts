/**
 * Assembles personalized, note-grounded content for every Study Workspace tool.
 * When no uploaded source exists, tools receive empty payloads — never demo data.
 */

import { t, type I18nKey, type Lang } from './i18n';
import type { QuizDef } from './domainContent';
import type { Course, GlossaryEntry, LearnerModel, Topic, UploadedFile } from '../types';
import type { WorkspaceToolId } from './taskFlows';
import { extractDefinitions } from './contentAnalysis';
import type { DebateNode, ConceptMapEdge, ConceptMapNode, ExtractedFormula } from './noteContentExtractors';
import { workspaceNoSourceMessage } from './workspaceEmptyState';
import {
  buildConceptMapFromCourse,
  buildDebateTreeFromNotes,
  buildFeynmanGaps,
  buildFeynmanGapTerms,
  buildFeynmanOutline,
  buildFlashcards,
  buildQuizFromNotes,
  buildWorkspaceStepsFromNotes,
  fallbackWorkspaceSteps,
  conceptRelevanceScore,
  extractComparisons,
  extractFormulas,
  extractWorkedExamples,
  findMatchingTopic,
  gatherAnalyzedText,
  notesSupportSandbox,
  relevantExcerpt,
  sandboxInsightFromNotes,
  topRelevantChunks,
} from './noteContentExtractors';
import type { NumericCue } from './numericCues';
import { extractNumericCues } from './numericCues';
import { analyzeDocumentStructure, type DocumentStructureReport } from './documentStructureReport';
import { detectDocumentSections } from './textSegmentation';

export interface WorkspaceSourceIntelligence {
  score: number;
  band: 'weak' | 'moderate' | 'strong';
  bestTool: WorkspaceToolId;
  bestToolReason: string;
  strengths: string[];
  gaps: string[];
  nextActions: string[];
  metrics: {
    passageCount: number;
    avgPassageRelevance: number;
    sectionCount: number;
    definitionCount: number;
    glossaryCount: number;
    workedExampleCount: number;
    formulaCount: number;
    comparisonCount: number;
    conceptNodeCount: number;
    stepCount: number;
  };
  documentStructure: DocumentStructureReport | null;
}

export interface WorkspaceNoteBundle {
  hasSource: boolean;
  sourceName: string;
  fileKey: string;
  /** Full analyzed source (preserves layout for Reader). */
  sourceFullText: string;
  /** Concept-focused BM25 excerpt (legacy tools / lesson). */
  readerText: string;
  /** Tighter excerpt for annotation/source panel. */
  annotationText: string;
  conceptMap: { nodes: ConceptMapNode[]; edges: ConceptMapEdge[] };
  leitnerCards: { front: string; back: string }[];
  compareRows: [string, string, string][];
  formulas: ExtractedFormula[];
  debateTree: DebateNode | null;
  feynmanOutline: string[];
  feynmanGaps: string[];
  feynmanGapTerms: string[];
  feynmanPlaceholder: string;
  workspaceSteps: { title: string; type: string }[] | null;
  quiz: QuizDef | null;
  economicsSandbox: boolean;
  numericCues: NumericCue[];
  sandboxInsight: string;
  matchingTopic: Topic | undefined;
  courseTitle: string | undefined;
  emptyMessage: string;
  sourceIntelligence: WorkspaceSourceIntelligence | null;
  documentStructure: DocumentStructureReport | null;
  /** Content pipeline version for annotation anchor migration. */
  pipelineVersion?: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function bandFromScore(score: number): WorkspaceSourceIntelligence['band'] {
  if (score >= 75) return 'strong';
  if (score >= 45) return 'moderate';
  return 'weak';
}

export function buildWorkspaceSourceIntelligence(opts: {
  text: string;
  concept: string;
  glossary: GlossaryEntry[];
  matchingTopic?: Topic;
  lang: Lang;
  conceptNodeCount: number;
  comparisonCount: number;
  formulaCount: number;
  stepCount: number;
  hasQuiz: boolean;
  documentStructure: DocumentStructureReport | null;
}): WorkspaceSourceIntelligence {
  const {
    text,
    concept,
    glossary,
    matchingTopic,
    lang,
    conceptNodeCount,
    comparisonCount,
    formulaCount,
    stepCount,
    hasQuiz,
  } = opts;
  const structure = opts.documentStructure;
  const excerpt = relevantExcerpt(text, concept, 14000);
  const chunks = topRelevantChunks(text, concept, 4);
  const chunkScores = chunks.map((chunk) => conceptRelevanceScore(`${chunk.heading ?? ''} ${chunk.text}`, concept));
  const passageCount = chunkScores.filter((score) => score >= 0.25).length;
  const avgPassageRelevance = chunkScores.length > 0
    ? chunkScores.reduce((sum, score) => sum + score, 0) / chunkScores.length
    : 0;
  const sectionCount = structure?.sectionCount
    ?? detectDocumentSections(text).filter(
      (s) => conceptRelevanceScore((s.heading ?? '') + s.text, concept) > 0.15,
    ).length;
  const definitionCount = extractDefinitions(excerpt, 10)
    .filter((entry) => conceptRelevanceScore(`${entry.term} ${entry.definition}`, concept) > 0.22)
    .length;
  const glossaryCount = glossary
    .filter((entry) => conceptRelevanceScore(`${entry.term} ${entry.definition}`, concept) > 0.18)
    .slice(0, 8)
    .length;
  const workedExampleCount = extractWorkedExamples(text, concept, 4).length;
  const objectiveCount = matchingTopic?.objectives?.length ?? 0;

  let score = Math.round(
    clamp01(passageCount / 4) * 28
    + clamp01(avgPassageRelevance / 0.65) * 18
    + clamp01(sectionCount / 4) * 12
    + clamp01((definitionCount + glossaryCount) / 6) * 14
    + clamp01((workedExampleCount + formulaCount + comparisonCount) / 5) * 12
    + clamp01(conceptNodeCount / 7) * 8
    + clamp01((stepCount + objectiveCount + (hasQuiz ? 1 : 0)) / 7) * 8,
  );
  if (passageCount < 2 && definitionCount === 0 && glossaryCount < 2) {
    score = Math.min(score, 39);
  }
  const band = bandFromScore(score);

  const strengths: string[] = [];
  if (passageCount >= 3) {
    strengths.push(
      t('srcIntelStrengthPassages', lang).replace('{passageCount}', String(passageCount)),
    );
  }
  if (sectionCount >= 2) {
    const structLabel = structure?.labels[0];
    strengths.push(
      t('srcIntelStrengthStructure', lang)
        .replace('{sectionCount}', String(sectionCount))
        .replace('{structSuffix}', structLabel ? ` (${structLabel})` : ''),
    );
  }
  if (definitionCount + glossaryCount >= 4) {
    strengths.push(t('srcIntelStrengthTerminology', lang));
  }
  if (workedExampleCount + formulaCount >= 2) {
    strengths.push(t('srcIntelStrengthExamples', lang));
  }
  if (comparisonCount >= 2) {
    strengths.push(t('srcIntelStrengthComparisons', lang));
  }

  const gaps: string[] = [];
  if (passageCount < 2) {
    gaps.push(t('srcIntelGapPassages', lang));
  }
  if (sectionCount < 2) {
    gaps.push(t('srcIntelGapStructure', lang));
  }
  if (definitionCount + glossaryCount < 2) {
    gaps.push(t('srcIntelGapDefinitions', lang));
  }
  if (workedExampleCount + formulaCount === 0) {
    gaps.push(t('srcIntelGapWorkedExamples', lang));
  }
  if (comparisonCount === 0 && conceptNodeCount < 4) {
    gaps.push(t('srcIntelGapRelational', lang));
  }

  const nextActions: string[] = [];
  if (passageCount < 2) {
    nextActions.push(t('srcIntelActionUploadMore', lang));
  }
  if (sectionCount < 2) {
    nextActions.push(t('srcIntelActionHeadings', lang));
  }
  if (definitionCount + glossaryCount < 2) {
    nextActions.push(t('srcIntelActionGlossary', lang));
  }
  if (workedExampleCount + formulaCount === 0) {
    nextActions.push(t('srcIntelActionPractice', lang));
  }
  if (comparisonCount === 0 && conceptNodeCount < 4) {
    nextActions.push(t('srcIntelActionCompare', lang));
  }

  const toolScores: Array<{ tool: WorkspaceToolId; score: number }> = [
    { tool: 'scratchpad', score: Math.min(formulaCount, 2) * 6 + Math.min(workedExampleCount, 2) * 2 },
    { tool: 'compare', score: Math.min(comparisonCount, 2) * 4 },
    { tool: 'leitner', score: Math.min(definitionCount, 3) * 2 + Math.min(glossaryCount, 3) * 2 },
    { tool: 'concept-map', score: Math.min(conceptNodeCount, 7) + Math.min(sectionCount, 3) + Math.min(objectiveCount, 2) },
    { tool: 'reader', score: passageCount * 2 + avgPassageRelevance * 5 },
    { tool: 'whiteboard', score: Math.min(workedExampleCount, 3) * 2 + Math.min(formulaCount, 2) },
    { tool: 'feynman', score: Math.min(stepCount, 5) + Math.min(objectiveCount, 2) + (hasQuiz ? 1 : 0) },
  ];
  toolScores.sort((a, b) => b.score - a.score);
  const bestTool = toolScores[0]?.tool ?? 'reader';
  const bestToolReasonKeys: Partial<Record<WorkspaceToolId, I18nKey>> = {
    scratchpad: 'bestToolReasonScratchpad',
    compare: 'bestToolReasonCompare',
    leitner: 'bestToolReasonLeitner',
    'concept-map': 'bestToolReasonConceptMap',
    reader: 'bestToolReasonReader',
    whiteboard: 'bestToolReasonWhiteboard',
    feynman: 'bestToolReasonFeynman',
  };
  const bestToolReason = t(bestToolReasonKeys[bestTool] ?? 'bestToolReasonReader', lang);

  return {
    score,
    band,
    bestTool,
    bestToolReason,
    strengths: strengths.slice(0, 3),
    gaps: gaps.slice(0, 3),
    nextActions: nextActions.slice(0, 3),
    metrics: {
      passageCount,
      avgPassageRelevance,
      sectionCount,
      definitionCount,
      glossaryCount,
      workedExampleCount,
      formulaCount,
      comparisonCount,
      conceptNodeCount,
      stepCount,
    },
    documentStructure: structure,
  };
}

export type BuildWorkspaceNoteBundleOpts = {
  uploadedFiles: UploadedFile[];
  glossaryEntries: GlossaryEntry[];
  courses: Course[];
  courseId?: string;
  concept: string;
  conceptBars: { concept: string; mastery: number }[];
  lang: Lang;
  learnerModel?: LearnerModel;
  /** Skip PMI/BM25 + heavy extractors for faster first paint. */
  lightweight?: boolean;
};

/** Pre-gathered inputs — one text blob for shell + worker (avoids duplicate gather / clone). */
export type WorkspaceNoteGathered = {
  text: string;
  fileNames: string[];
  hasSource: boolean;
  linkedCourseId?: string;
  course?: Course;
  scopedGlossary: GlossaryEntry[];
  topics: Topic[];
  matchingTopic?: Topic;
  pipelineVersion?: string;
  emptyMessage: string;
};

export function gatherWorkspaceNoteInputs(opts: BuildWorkspaceNoteBundleOpts): WorkspaceNoteGathered {
  const { uploadedFiles, glossaryEntries, courses, courseId, concept, lang } = opts;
  const { text, fileNames, hasSource } = gatherAnalyzedText(uploadedFiles, courseId);
  const linkedCourseId =
    courseId ?? uploadedFiles.find((f) => f.extractedText?.trim() && f.courseId)?.courseId;
  const course = linkedCourseId ? courses.find((c) => c.id === linkedCourseId) : undefined;
  const scopedGlossary = glossaryEntries.filter(
    (g) => linkedCourseId && g.courseId === linkedCourseId,
  );
  const topics = course?.topics ?? [];
  const linkedFile = uploadedFiles.find(
    (f) => f.courseId === linkedCourseId && (f.extractedText?.trim().length ?? 0) > 0,
  );
  return {
    text,
    fileNames,
    hasSource,
    linkedCourseId,
    course,
    scopedGlossary,
    topics,
    matchingTopic: findMatchingTopic(topics, concept),
    pipelineVersion: linkedFile?.pipelineVersion ?? course?.pipelineMeta?.version,
    emptyMessage: workspaceNoSourceMessage(lang),
  };
}

/**
 * Instant metadata-only gather — skips joining large extractedText blobs (1C defer path).
 */
export function buildPendingWorkspaceNoteGathered(opts: BuildWorkspaceNoteBundleOpts): WorkspaceNoteGathered {
  const { uploadedFiles, glossaryEntries, courses, courseId, concept, lang } = opts;
  const linkedCourseId =
    courseId ?? uploadedFiles.find((f) => f.extractedText?.trim() && f.courseId)?.courseId;
  const course = linkedCourseId ? courses.find((c) => c.id === linkedCourseId) : undefined;
  const scopedGlossary = glossaryEntries.filter(
    (g) => linkedCourseId && g.courseId === linkedCourseId,
  );
  const topics = course?.topics ?? [];
  const linkedFile = uploadedFiles.find(
    (f) => f.courseId === linkedCourseId && (f.extractedText?.trim().length ?? 0) > 0,
  );
  const hasLikelySource = uploadedFiles.some((f) => {
    if (f.status !== 'analyzed' && f.status !== 'processing') return false;
    const body = f.extractedText?.trim();
    if (!body || body.length < 80) return false;
    if (courseId && f.courseId && f.courseId !== courseId) return false;
    return true;
  });
  return {
    text: '',
    fileNames: linkedFile ? [linkedFile.name] : [],
    hasSource: hasLikelySource,
    linkedCourseId,
    course,
    scopedGlossary,
    topics,
    matchingTopic: findMatchingTopic(topics, concept),
    pipelineVersion: linkedFile?.pipelineVersion ?? course?.pipelineMeta?.version,
    emptyMessage: workspaceNoSourceMessage(lang),
  };
}

function emptyWorkspaceNoteBundle(concept: string, lang: Lang, emptyMessage: string): WorkspaceNoteBundle {
  return {
    hasSource: false,
    sourceName: '',
    fileKey: 'no-source',
    sourceFullText: '',
    readerText: '',
    annotationText: '',
    conceptMap: { nodes: [], edges: [] },
    leitnerCards: [],
    compareRows: [],
    formulas: [],
    debateTree: null,
    feynmanOutline: [
      t('feynmanNoSourceOutline1', lang).replace('{concept}', concept),
      t('feynmanNoSourceOutline2', lang),
    ],
    feynmanGaps: [t('feynmanNoSourceGap', lang)],
    feynmanGapTerms: [],
    feynmanPlaceholder: t('feynmanNoSourcePlaceholder', lang).replace('{concept}', concept),
    workspaceSteps: null,
    quiz: null,
    economicsSandbox: false,
    numericCues: [],
    sandboxInsight: '',
    matchingTopic: undefined,
    courseTitle: undefined,
    emptyMessage,
    sourceIntelligence: null,
    documentStructure: null,
    pipelineVersion: undefined,
  };
}

/** Build bundle from pre-gathered text (shell on main thread, full bundle in worker). */
export function buildWorkspaceNoteBundleFromGathered(
  gathered: WorkspaceNoteGathered,
  opts: Pick<BuildWorkspaceNoteBundleOpts, 'concept' | 'conceptBars' | 'lang' | 'learnerModel'>,
  lightweight = false,
): WorkspaceNoteBundle {
  const { concept, conceptBars, lang, learnerModel } = opts;
  const {
    text, fileNames, hasSource, course, topics, matchingTopic, scopedGlossary,
    pipelineVersion, emptyMessage, linkedCourseId,
  } = gathered;

  if (!hasSource) {
    return emptyWorkspaceNoteBundle(concept, lang, emptyMessage);
  }

  const sourceFullText = text;
  const readerText = lightweight ? text.slice(0, 12000) : relevantExcerpt(text, concept, 12000);
  const annotationText = lightweight ? text.slice(0, 16000) : relevantExcerpt(text, concept, 16000);
  const sourceName = fileNames.join(', ') || course?.title || 'Your notes';
  const fileKey = fileNames[0] ?? linkedCourseId ?? 'notes';

  const conceptMap = buildConceptMapFromCourse(
    topics,
    scopedGlossary,
    conceptBars,
    concept,
    lightweight ? undefined : text,
  );

  if (lightweight) {
    return {
      hasSource: true,
      sourceName,
      fileKey,
      sourceFullText,
      readerText,
      annotationText,
      conceptMap,
      leitnerCards: [],
      compareRows: [],
      formulas: [],
      debateTree: null,
      feynmanOutline: matchingTopic
        ? [matchingTopic.title, matchingTopic.description ?? ''].filter(Boolean)
        : [concept],
      feynmanGaps: [],
      feynmanGapTerms: [],
      feynmanPlaceholder: t('feynmanExplainPlaceholder', lang).replace('{concept}', concept),
      workspaceSteps: null,
      quiz: null,
      economicsSandbox: false,
      numericCues: [],
      sandboxInsight: '',
      matchingTopic,
      courseTitle: course?.title,
      emptyMessage,
      sourceIntelligence: null,
      documentStructure: null,
      pipelineVersion,
    };
  }

  const documentStructure = analyzeDocumentStructure(text, lang);
  const leitnerFromNotes = buildFlashcards(text, concept, scopedGlossary, lang);
  const compareRows = extractComparisons(text, concept, scopedGlossary);
  const formulas = extractFormulas(text, concept);
  const workspaceSteps = buildWorkspaceStepsFromNotes(text, concept, lang);
  const quiz = buildQuizFromNotes(text, concept, scopedGlossary, lang);
  const sourceIntelligence = buildWorkspaceSourceIntelligence({
    text,
    concept,
    glossary: scopedGlossary,
    matchingTopic,
    lang,
    conceptNodeCount: conceptMap.nodes.length,
    comparisonCount: compareRows.length,
    formulaCount: formulas.length,
    stepCount: workspaceSteps?.length ?? 0,
    hasQuiz: Boolean(quiz),
    documentStructure,
  });

  const spacingCards = (learnerModel?.spacingIntervals ?? [])
    .filter((s) => s.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 5))
      || concept.toLowerCase().includes(s.concept.toLowerCase().slice(0, 5)))
    .map((s) => ({
      front: s.concept,
      back: scopedGlossary.find((g) => g.term.toLowerCase().includes(s.concept.toLowerCase().slice(0, 6)))?.definition
        ?? t('nextReviewInDays', lang).replace('{days}', String(Math.round(s.interval))),
    }));

  const leitnerCards = [...spacingCards, ...leitnerFromNotes].filter(
    (c, i, arr) => arr.findIndex((x) => x.front === c.front) === i,
  );

  return {
    hasSource: true,
    sourceName,
    fileKey,
    sourceFullText,
    readerText,
    annotationText,
    conceptMap,
    leitnerCards,
    compareRows,
    formulas,
    debateTree: buildDebateTreeFromNotes(text, concept),
    feynmanOutline: buildFeynmanOutline(matchingTopic, text, concept, lang),
    feynmanGaps: buildFeynmanGaps(scopedGlossary, concept, lang),
    feynmanGapTerms: buildFeynmanGapTerms(scopedGlossary, concept),
    feynmanPlaceholder: t('feynmanExplainPlaceholder', lang).replace('{concept}', concept),
    workspaceSteps: workspaceSteps ?? fallbackWorkspaceSteps(concept, lang),
    quiz,
    economicsSandbox: notesSupportSandbox(text, concept, formulas),
    numericCues: extractNumericCues(text, concept),
    sandboxInsight: sandboxInsightFromNotes(text, concept, lang),
    matchingTopic,
    courseTitle: course?.title,
    emptyMessage,
    sourceIntelligence,
    documentStructure,
    pipelineVersion,
  };
}

export function buildWorkspaceNoteBundle(opts: BuildWorkspaceNoteBundleOpts): WorkspaceNoteBundle {
  const gathered = gatherWorkspaceNoteInputs(opts);
  return buildWorkspaceNoteBundleFromGathered(gathered, opts, opts.lightweight ?? false);
}
