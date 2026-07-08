import type { Lang } from './i18n';
import type { NoteAnalysisStageId } from './noteAnalysisSnapshot';

export type NoteAnalysisContent = {
  pageTitle: string;
  subtitle: (course: string, score: number | null) => string;
  stageNames: Record<NoteAnalysisStageId, string>;
  continueToCourse: string;
  openWorkspace: string;
  backToLibrary: string;
  fileProcessing: string;
  pagesParsed: string;
  wordsExtracted: string;
  filesUploaded: string;
  contentDiagnosis: string;
  detectedSubject: string;
  extractedItems: string;
  detectedIssues: string;
  algorithmTransparency: string;
  bm25Ranking: string;
  textRankSentences: string;
  keyphraseRankings: string;
  knowledgeGraph: string;
  courseArchitecture: string;
  qualityAssurance: string;
  noIssues: string;
  generateCourse: string;
};

const STAGE_EN: Record<NoteAnalysisStageId, string> = {
  1: 'File Processing',
  2: 'Content Diagnosis',
  2.5: 'Algorithm Transparency',
  3: 'Knowledge Graph',
  4: 'Course Architecture',
  5: 'Quality Assurance',
};

const STAGE_EL: Record<NoteAnalysisStageId, string> = {
  1: 'Επεξεργασία αρχείων',
  2: 'Διάγνωση περιεχομένου',
  2.5: 'Διαφάνεια αλγορίθμων',
  3: 'Γράφημα γνώσης',
  4: 'Αρχιτεκτονική μαθήματος',
  5: 'Διασφάλιση ποιότητας',
};

const EN: NoteAnalysisContent = {
  pageTitle: 'Note Analysis',
  subtitle: (course, score) => score != null
    ? `${course} · Source quality ${score}%`
    : course,
  stageNames: STAGE_EN,
  continueToCourse: 'View course',
  openWorkspace: 'Open workspace',
  backToLibrary: 'Back to library',
  fileProcessing: 'Files processed',
  pagesParsed: 'Pages estimated',
  wordsExtracted: 'Words extracted',
  filesUploaded: 'Source files',
  contentDiagnosis: 'Content diagnosis',
  detectedSubject: 'Detected subject',
  extractedItems: 'Extracted items',
  detectedIssues: 'Detected issues',
  algorithmTransparency: 'See how BM25, TextRank, and keyphrase extraction work on your notes.',
  bm25Ranking: 'BM25 term ranking',
  textRankSentences: 'TextRank sentence scores',
  keyphraseRankings: 'Keyphrase rankings',
  knowledgeGraph: 'Concept knowledge graph',
  courseArchitecture: 'Generated course modules',
  qualityAssurance: 'Quality assurance metrics',
  noIssues: 'No critical issues detected — material looks ready for course generation.',
  generateCourse: 'Continue to course',
};

const EL: NoteAnalysisContent = {
  pageTitle: 'Ανάλυση σημειώσεων',
  subtitle: (course, score) => score != null
    ? `${course} · Ποιότητα πηγής ${score}%`
    : course,
  stageNames: STAGE_EL,
  continueToCourse: 'Προβολή μαθήματος',
  openWorkspace: 'Άνοιγμα workspace',
  backToLibrary: 'Πίσω στη βιβλιοθήκη',
  fileProcessing: 'Επεξεργασμένα αρχεία',
  pagesParsed: 'Εκτιμώμενες σελίδες',
  wordsExtracted: 'Εξαγόμενες λέξεις',
  filesUploaded: 'Αρχεία πηγής',
  contentDiagnosis: 'Διάγνωση περιεχομένου',
  detectedSubject: 'Ανιχνευμένο αντικείμενο',
  extractedItems: 'Εξαγόμενα στοιχεία',
  detectedIssues: 'Ανιχνευμένα θέματα',
  algorithmTransparency: 'Δες πώς λειτουργούν BM25, TextRank και εξαγωγή keyphrases στις σημειώσεις σου.',
  bm25Ranking: 'Κατάταξη όρων BM25',
  textRankSentences: 'Βαθμολογίες προτάσεων TextRank',
  keyphraseRankings: 'Κατάταξη keyphrases',
  knowledgeGraph: 'Γράφημα εννοιών',
  courseArchitecture: 'Modules μαθήματος',
  qualityAssurance: 'Μετρικές ποιότητας',
  noIssues: 'Δεν εντοπίστηκαν κρίσιμα θέματα — το υλικό φαίνεται έτοιμο.',
  generateCourse: 'Συνέχεια στο μάθημα',
};

export function getNoteAnalysisContent(lang: Lang): NoteAnalysisContent {
  return lang === 'el' ? EL : EN;
}

export const NOTE_ANALYSIS_STAGES: NoteAnalysisStageId[] = [1, 2, 2.5, 3, 4, 5];
