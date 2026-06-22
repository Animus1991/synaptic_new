import type { Lang } from './i18n';

export type LessonStepKey =
  | 'hook'
  | 'prior'
  | 'core'
  | 'worked-example'
  | 'practice'
  | 'misconception'
  | 'retrieval'
  | 'summary';

export type LessonStepDef = { key: LessonStepKey; label: string };

export type QuizKind = 'mc' | 'short-answer' | 'ordering' | 'matching';

/** Discriminated quiz payload — `kind` defaults to `mc` for backward compatibility. */
export type QuizDef =
  | {
      kind?: 'mc';
      question: string;
      options: string[];
      correctIndex: number;
    }
  | {
      kind: 'short-answer';
      question: string;
      acceptedAnswers: string[];
      hint?: string;
    }
  | {
      kind: 'ordering';
      question: string;
      items: string[];
      correctOrder: number[];
    }
  | {
      kind: 'matching';
      question: string;
      left: string[];
      right: string[];
      pairs: [number, number][];
    };

export function quizKind(def: QuizDef): QuizKind {
  return def.kind ?? 'mc';
}

export function isMcQuiz(def: QuizDef): def is Extract<QuizDef, { options: string[] }> {
  return quizKind(def) === 'mc';
}

const STEP_LABELS: Record<Lang, Record<LessonStepKey, string>> = {
  en: {
    hook: 'Hook',
    prior: 'Prior Knowledge',
    core: 'Core Concept',
    'worked-example': 'Worked Example',
    practice: 'Practice',
    misconception: 'Common Misconception',
    retrieval: 'Retrieval Check',
    summary: 'Summary',
  },
  el: {
    hook: 'Εισαγωγή',
    prior: 'Προηγούμενες Γνώσεις',
    core: 'Βασική Έννοια',
    'worked-example': 'Επιλυμένο Παράδειγμα',
    practice: 'Εξάσκηση',
    misconception: 'Συχνή Παρανόηση',
    retrieval: 'Έλεγχος Ανάκλησης',
    summary: 'Περίληψη',
  },
};

export function lessonStepLabel(key: LessonStepKey, lang: Lang): string {
  return STEP_LABELS[lang][key];
}

/** Generic upload-gated quiz placeholder (no domain-specific demo content). */
export function genericQuizPlaceholder(concept: string, lang: Lang): QuizDef {
  return {
    question: lang === 'el'
      ? `Ανέβασε σημειώσεις για κουίζ στο «${concept}».`
      : `Upload notes to generate a quiz for «${concept}».`,
    options: lang === 'el'
      ? ['Θα δημιουργηθεί από το υλικό σου', '—', '—', '—']
      : ['Will be generated from your material', '—', '—', '—'],
    correctIndex: 0,
  };
}

export type WorkspaceStep = { title: string; type: string };

/** Minimal step rail when no note sections exist yet. */
export function genericWorkspaceSteps(concept: string, lang: Lang): WorkspaceStep[] {
  if (lang === 'el') {
    return [
      { title: 'Γιατί μετράει;', type: 'Εισαγωγή' },
      { title: 'Τι ξέρεις ήδη;', type: 'Προηγούμενες Γνώσεις' },
      { title: concept, type: 'Βασική Έννοια' },
      { title: 'Επιλυμένο Παράδειγμα', type: 'Παράδειγμα' },
      { title: 'Εφαρμογή', type: 'Εξάσκηση' },
      { title: 'Έλεγχος Ανάκλησης', type: 'Κουίζ' },
      { title: 'Περίληψη', type: 'Συμπέρασμα' },
    ];
  }
  return [
    { title: 'Why does this matter?', type: 'Hook' },
    { title: 'What do you already know?', type: 'Prior Knowledge' },
    { title: concept, type: 'Core Concept' },
    { title: 'Worked Example', type: 'Example' },
    { title: 'Application', type: 'Practice' },
    { title: 'Retrieval Check', type: 'Quiz' },
    { title: 'Summary', type: 'Wrap-up' },
  ];
}
