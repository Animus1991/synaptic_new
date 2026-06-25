/**
 * Assembles personalized, note-grounded content for every Study Workspace tool.
 * When no uploaded source exists, tools receive empty payloads — never demo data.
 */

import type { Lang } from './i18n';
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
      lang === 'el'
        ? `Ισχυρή τεκμηρίωση της έννοιας σε ${passageCount} σχετικά αποσπάσματα.`
        : `Strong evidence for the concept across ${passageCount} relevant source passages.`,
    );
  }
  if (sectionCount >= 2) {
    const structLabel = structure?.labels[0];
    strengths.push(
      lang === 'el'
        ? `Το υλικό έχει καθαρή δομή με ${sectionCount} ενότητες${structLabel ? ` (${structLabel})` : ''}.`
        : `The material has clear structure with ${sectionCount} sections${structLabel ? ` (${structLabel})` : ''}.`,
    );
  }
  if (definitionCount + glossaryCount >= 4) {
    strengths.push(
      lang === 'el'
        ? 'Υπάρχει αρκετή ορολογία για ποιοτικά quiz, flashcards και explanations.'
        : 'There is enough terminology to support high-quality quizzes, flashcards, and explanations.',
    );
  }
  if (workedExampleCount + formulaCount >= 2) {
    strengths.push(
      lang === 'el'
        ? 'Ανιχνεύτηκαν παραδείγματα ή τύποι που υποστηρίζουν ουσιαστική practice.'
        : 'Examples or formulas were detected, which supports meaningful practice.',
    );
  }
  if (comparisonCount >= 2) {
    strengths.push(
      lang === 'el'
        ? 'Το περιεχόμενο περιλαμβάνει συγκρίσεις που βοηθούν βαθύτερη κατανόηση.'
        : 'The content contains comparisons that support deeper understanding.',
    );
  }

  const gaps: string[] = [];
  if (passageCount < 2) {
    gaps.push(
      lang === 'el'
        ? 'Η έννοια εμφανίζεται σε λίγα ισχυρά αποσπάσματα, άρα το grounding παραμένει εύθραυστο.'
        : 'The concept appears in too few strong passages, so grounding remains fragile.',
    );
  }
  if (sectionCount < 2) {
    gaps.push(
      lang === 'el'
        ? 'Οι σημειώσεις έχουν ασθενή δομή, οπότε τα lesson steps βασίζονται περισσότερο σε heuristics.'
        : 'The notes have weak structure, so lesson steps rely more heavily on heuristics.',
    );
  }
  if (definitionCount + glossaryCount < 2) {
    gaps.push(
      lang === 'el'
        ? 'Υπάρχουν λίγοι ρητοί ορισμοί ή glossary anchors για την έννοια.'
        : 'There are too few explicit definitions or glossary anchors for this concept.',
    );
  }
  if (workedExampleCount + formulaCount === 0) {
    gaps.push(
      lang === 'el'
        ? 'Δεν εντοπίστηκαν λυμένα παραδείγματα ή υπολογιστικά στοιχεία για practice.'
        : 'No worked examples or computational cues were detected for practice.',
    );
  }
  if (comparisonCount === 0 && conceptNodeCount < 4) {
    gaps.push(
      lang === 'el'
        ? 'Η σχεσιακή κάλυψη της έννοιας είναι περιορισμένη και το concept graph παραμένει ρηχό.'
        : 'Relational coverage is limited, so the concept graph stays shallow.',
    );
  }

  const nextActions: string[] = [];
  if (passageCount < 2) {
    nextActions.push(
      lang === 'el'
        ? 'Ανέβασε ακόμη μία διάλεξη, chapter ή set σημειώσεων ειδικά για αυτή την έννοια.'
        : 'Upload one more lecture, chapter, or note set focused on this concept.',
    );
  }
  if (sectionCount < 2) {
    nextActions.push(
      lang === 'el'
        ? 'Πρόσθεσε υλικό με headings ή καθαρές ενότητες ώστε το course flow να γίνει πιο αξιόπιστο.'
        : 'Add material with headings or clear sections so the course flow becomes more reliable.',
    );
  }
  if (definitionCount + glossaryCount < 2) {
    nextActions.push(
      lang === 'el'
        ? 'Συνδύασε lecture notes με slides ή glossary-heavy υλικό για πιο καθαρούς ορισμούς.'
        : 'Combine lecture notes with slides or glossary-heavy material for clearer definitions.',
    );
  }
  if (workedExampleCount + formulaCount === 0) {
    nextActions.push(
      lang === 'el'
        ? 'Πρόσθεσε λυμένες ασκήσεις, παραδείγματα ή problem sets για ισχυρότερη practice generation.'
        : 'Add solved exercises, examples, or problem sets for stronger practice generation.',
    );
  }
  if (comparisonCount === 0 && conceptNodeCount < 4) {
    nextActions.push(
      lang === 'el'
        ? 'Ανέβασε υλικό που συγκρίνει έννοιες ή δείχνει σχέσεις prerequisite/contrast.'
        : 'Upload material that compares concepts or makes prerequisite/contrast relations explicit.',
    );
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
  const bestToolReason = bestTool === 'scratchpad'
    ? (lang === 'el'
      ? 'Οι σημειώσεις περιέχουν τύπους ή υπολογιστικά μοτίβα που αξίζει να δουλευτούν ενεργά.'
      : 'The notes contain formulas or computational patterns worth working through actively.')
    : bestTool === 'compare'
      ? (lang === 'el'
        ? 'Το υλικό έχει αρκετές συγκρίσεις για να ξεκαθαρίσεις ομοιότητες και διαφορές.'
        : 'The material contains enough comparisons to clarify similarities and differences.')
      : bestTool === 'leitner'
        ? (lang === 'el'
          ? 'Η έννοια υποστηρίζεται από αρκετή ορολογία για αποδοτικό retrieval practice.'
          : 'The concept is supported by enough terminology for efficient retrieval practice.')
        : bestTool === 'concept-map'
          ? (lang === 'el'
            ? 'Υπάρχουν αρκετοί σχετικοί κόμβοι και σχέσεις για εννοιολογική χαρτογράφηση.'
            : 'There are enough related nodes and relations for concept mapping.')
          : bestTool === 'whiteboard'
            ? (lang === 'el'
              ? 'Η έννοια ταιριάζει σε worked examples και οπτική επίλυση βήμα-βήμα.'
              : 'This concept benefits from worked examples and visual step-by-step solving.')
            : bestTool === 'feynman'
              ? (lang === 'el'
                ? 'Το υλικό προσφέρεται για self-explanation και έλεγχο κατανόησης.'
                : 'The material is well-suited to self-explanation and understanding checks.')
              : (lang === 'el'
                ? 'Τα πιο ισχυρά αποσπάσματα βρίσκονται στον reader και δίνουν το καλύτερο grounded context.'
                : 'The strongest grounded context is in the reader excerpts.');

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

export function buildWorkspaceNoteBundle(opts: {
  uploadedFiles: UploadedFile[];
  glossaryEntries: GlossaryEntry[];
  courses: Course[];
  courseId?: string;
  concept: string;
  conceptBars: { concept: string; mastery: number }[];
  lang: Lang;
  learnerModel?: LearnerModel;
}): WorkspaceNoteBundle {
  const { uploadedFiles, glossaryEntries, courses, courseId, concept, conceptBars, lang, learnerModel } = opts;

  const { text, fileNames, hasSource } = gatherAnalyzedText(uploadedFiles, courseId);
  const linkedCourseId =
    courseId ?? uploadedFiles.find((f) => f.extractedText?.trim() && f.courseId)?.courseId;
  const course = linkedCourseId ? courses.find((c) => c.id === linkedCourseId) : undefined;
  const scopedGlossary = glossaryEntries.filter(
    (g) => linkedCourseId && g.courseId === linkedCourseId,
  );
  const topics = course?.topics ?? [];
  const matchingTopic = findMatchingTopic(topics, concept);

  const emptyMessage = workspaceNoSourceMessage(lang);

  if (!hasSource) {
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
      feynmanOutline: lang === 'el'
        ? [`Ανέβασε τις σημειώσεις σου για το «${concept}»`, 'Μετά εξήγησε με δικά σου λόγια μόνο από το υλικό σου']
        : [`Upload your notes for «${concept}»`, 'Then explain in your own words using only your material'],
      feynmanGaps: lang === 'el'
        ? ['Χωρίς ανεβασμένο υλικό δεν μπορούμε να ελέγξουμε ακρίβεια — ανέβασε πρώτα τις σημειώσεις.']
        : ['Without uploaded material we cannot verify accuracy — upload your notes first.'],
      feynmanGapTerms: [],
      feynmanPlaceholder:
        lang === 'el'
          ? `Εξήγησε το «${concept}» — ανέβασε πρώτα τις σημειώσεις σου για στοχευμένη ανατροφοδότηση.`
          : `Explain «${concept}» — upload your notes first for targeted feedback.`,
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

  const documentStructure = analyzeDocumentStructure(text, lang);
  const sourceFullText = text;
  const readerText = relevantExcerpt(text, concept, 12000);
  const annotationText = relevantExcerpt(text, concept, 16000);
  const sourceName = fileNames.join(', ') || course?.title || 'Your notes';
  const fileKey = fileNames[0] ?? courseId ?? 'notes';
  const linkedFile = uploadedFiles.find(
    (f) => f.courseId === linkedCourseId && (f.extractedText?.trim().length ?? 0) > 0,
  );
  const pipelineVersion = linkedFile?.pipelineVersion ?? course?.pipelineMeta?.version;

  const conceptMap = buildConceptMapFromCourse(topics, scopedGlossary, conceptBars, concept, text);
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

  // Merge FSRS spacing cards that match the concept, but only if they exist in learner model.
  const spacingCards = (learnerModel?.spacingIntervals ?? [])
    .filter((s) => s.concept.toLowerCase().includes(concept.toLowerCase().slice(0, 5))
      || concept.toLowerCase().includes(s.concept.toLowerCase().slice(0, 5)))
    .map((s) => ({
      front: s.concept,
      back: scopedGlossary.find((g) => g.term.toLowerCase().includes(s.concept.toLowerCase().slice(0, 6)))?.definition
        ?? (lang === 'el' ? `Επόμενη επανάληψη σε ${Math.round(s.interval)} ημέρες` : `Next review in ${Math.round(s.interval)} days`),
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
    feynmanPlaceholder:
      lang === 'el'
        ? `Εξήγησε το «${concept}» με απλά λόγια, βασιζόμενος/η μόνο στις σημειώσεις σου…`
        : `Explain «${concept}» simply, using only your uploaded notes…`,
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
