import type { TaskType } from '../types';
import type { Lang } from './i18n';
import type { SessionType } from './taskFlows';
import type { Play } from '@/lib/lucide-shim';
import { Brain, Flame, RotateCcw, Target, Zap } from '@/lib/lucide-shim';

export type TaskFilter = 'all' | 'learn' | 'review' | 'practice' | 'exam' | 'fix' | 'completed';

export type SessionTypeEntry = {
  type: SessionType;
  label: string;
  desc: string;
  minutes: number;
  icon: typeof Play;
};

export type TasksContent = {
  pageTitle: string;
  startSession: string;
  studyPlanTitle: string;
  dangerZoneTitle: string;
  reviewsDue: (count: number) => string;
  totalMinutes: (minutes: number) => string;
  examToday: string;
  examInDays: (days: number) => string;
  noExamDate: string;
  spacedRepetition: string;
  retention: (percent: number) => string;
  recallPrompt: string;
  fsrsAgain: string;
  fsrsHard: string;
  fsrsGood: string;
  fsrsEasy: string;
  emptyTitle: string;
  emptyDescription: string;
  showAllTasks: string;
  sessionTaskCount: (minutes: number, count: number) => string;
  formatSubtitle: (pending: number, completed: number, xp: number) => string;
  studyPlanRetryMistakes: string;
  studyPlanSpacedReviews: string;
  studyPlanWeakConcepts: string;
  startPractice: string;
  openWorkspace: string;
  openAgent: string;
  startReview: string;
  retryMistakes: string;
  startRepair: string;
  startExamPrep: string;
  takeQuiz: string;
  startLesson: string;
  generatedLessonTitle: (topic: string) => string;
  generatedWorkspaceTitle: (concept: string) => string;
  generatedReviewTitle: (topic: string) => string;
  generatedExamPrepTitle: (courseTitle: string) => string;
  generatedLessonDesc: (topic: string) => string;
  generatedWorkspaceDesc: string;
  generatedReviewDesc: (topic: string) => string;
  generatedExamPrepDesc: string;
  courseScopeLabel: (courseName: string) => string;
  showAllCourses: string;
};

const EN: TasksContent = {
  pageTitle: 'Tasks',
  startSession: 'Start Session',
  studyPlanTitle: "Today's study plan",
  dangerZoneTitle: 'Danger Zone — Needs Immediate Attention',
  reviewsDue: (count) => `${count} reviews due`,
  totalMinutes: (minutes) => `~${minutes} min total`,
  examToday: 'Exam today',
  examInDays: (days) => `Exam in ${days} day${days === 1 ? '' : 's'}`,
  noExamDate: 'No exam date set',
  spacedRepetition: 'Spaced repetition',
  retention: (percent) => `Retention: ${percent}%`,
  recallPrompt: 'How well did you recall this?',
  fsrsAgain: 'Again',
  fsrsHard: 'Hard',
  fsrsGood: 'Good',
  fsrsEasy: 'Easy',
  emptyTitle: 'All done!',
  emptyDescription: 'No tasks match this filter. Try another category or start a focused session.',
  showAllTasks: 'Show all tasks',
  sessionTaskCount: (minutes, count) => `${minutes} min · ${count} task${count === 1 ? '' : 's'}`,
  formatSubtitle: (pending, completed, xp) => `${pending} pending · ${completed} done · ${xp} XP available`,
  studyPlanRetryMistakes: 'Retry mistakes',
  studyPlanSpacedReviews: 'Spaced reviews',
  studyPlanWeakConcepts: 'Weak concepts',
  startPractice: 'Start Practice',
  openWorkspace: 'Open Workspace',
  openAgent: 'Open Agent',
  startReview: 'Start Review',
  retryMistakes: 'Retry Mistakes',
  startRepair: 'Start Repair',
  startExamPrep: 'Start Exam Prep',
  takeQuiz: 'Take Quiz',
  startLesson: 'Start Lesson',
  generatedLessonTitle: (topic) => `Lesson: ${topic}`,
  generatedWorkspaceTitle: (concept) => `Study Workspace: ${concept}`,
  generatedReviewTitle: (topic) => `Review: ${topic}`,
  generatedExamPrepTitle: (courseTitle) => `Exam prep: ${courseTitle}`,
  generatedLessonDesc: (topic) => `Study ${topic} from your uploaded material.`,
  generatedWorkspaceDesc: 'Interactive study — concept map, flashcards, and recall from your notes.',
  generatedReviewDesc: (topic) => `Spaced recall for concepts in ${topic}.`,
  generatedExamPrepDesc: 'Review all topics before your exam.',
  courseScopeLabel: (courseName) => `Showing tasks for ${courseName}`,
  showAllCourses: 'Show all courses',
};

const EL: TasksContent = {
  pageTitle: 'Εργασίες',
  startSession: 'Έναρξη Συνεδρίας',
  studyPlanTitle: 'Σημερινό πλάνο μελέτης',
  dangerZoneTitle: 'Ζώνη Κινδύνου — Άμεση Προσοχή',
  reviewsDue: (count) => `${count} επαναλήψεις due`,
  totalMinutes: (minutes) => `~${minutes} λεπτά συνολικά`,
  examToday: 'Εξέταση σήμερα',
  examInDays: (days) => `Εξέταση σε ${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}`,
  noExamDate: 'Δεν έχει οριστεί ημερομηνία εξέτασης',
  spacedRepetition: 'Διαστηματική επανάληψη',
  retention: (percent) => `Retention: ${percent}%`,
  recallPrompt: 'Πόσο καλά το θυμήθηκες;',
  fsrsAgain: 'Ξανά',
  fsrsHard: 'Δύσκολο',
  fsrsGood: 'Καλά',
  fsrsEasy: 'Εύκολο',
  emptyTitle: 'Όλα έτοιμα!',
  emptyDescription: 'Κανένα task δεν ταιριάζει σε αυτό το φίλτρο. Δοκίμασε άλλη κατηγορία ή ξεκίνα focused session.',
  showAllTasks: 'Εμφάνιση όλων',
  sessionTaskCount: (minutes, count) => `${minutes} λεπ · ${count} task${count === 1 ? '' : 's'}`,
  formatSubtitle: (pending, completed, xp) => `${pending} εκκρεμή · ${completed} ολοκληρωμένα · ${xp} XP διαθέσιμα`,
  studyPlanRetryMistakes: 'Επανάληψη λαθών',
  studyPlanSpacedReviews: 'Διαστηματικές επαναλήψεις',
  studyPlanWeakConcepts: 'Αδύναμες έννοιες',
  startPractice: 'Έναρξη Εξάσκησης',
  openWorkspace: 'Άνοιγμα Workspace',
  openAgent: 'Άνοιγμα Agent',
  startReview: 'Έναρξη Επανάληψης',
  retryMistakes: 'Επανάληψη Λαθών',
  startRepair: 'Έναρξη Επιδιόρθωσης',
  startExamPrep: 'Έναρξη Προετοιμασίας',
  takeQuiz: 'Κουίζ',
  startLesson: 'Έναρξη Μαθήματος',
  generatedLessonTitle: (topic) => `Μάθημα: ${topic}`,
  generatedWorkspaceTitle: (concept) => `Study Workspace: ${concept}`,
  generatedReviewTitle: (topic) => `Επανάληψη: ${topic}`,
  generatedExamPrepTitle: (courseTitle) => `Προετοιμασία εξέτασης: ${courseTitle}`,
  generatedLessonDesc: (topic) => `Μελέτη ${topic} από το ανεβασμένο υλικό σου.`,
  generatedWorkspaceDesc: 'Διαδραστική μελέτη — concept map, flashcards και ανάκληση από τις σημειώσεις σου.',
  generatedReviewDesc: (topic) => `Διαστηματική ανάκληση για έννοιες στο ${topic}.`,
  generatedExamPrepDesc: 'Επανάληψη όλων των θεμάτων πριν την εξέταση.',
  courseScopeLabel: (courseName) => `Εργασίες για ${courseName}`,
  showAllCourses: 'Εμφάνιση όλων των μαθημάτων',
};

const TASK_TYPE_LABELS: Record<Lang, Record<TaskType, string>> = {
  en: {
    lesson: 'Lesson',
    quiz: 'Quiz',
    review: 'Review',
    practice: 'Practice',
    'exam-prep': 'Exam Prep',
    flashcards: 'Flashcards',
    'mistake-retry': 'Retry Mistakes',
    'concept-check': 'Concept Check',
    'deep-dive': 'Deep Dive',
    'timed-test': 'Timed Test',
    'self-explanation': 'Self-Explain',
    comparison: 'Compare',
    'prerequisite-repair': 'Prereq Repair',
    'oral-exam': 'Oral Exam',
  },
  el: {
    lesson: 'Μάθημα',
    quiz: 'Κουίζ',
    review: 'Επανάληψη',
    practice: 'Εξάσκηση',
    'exam-prep': 'Προετοιμασία Εξέτασης',
    flashcards: 'Flashcards',
    'mistake-retry': 'Επανάληψη Λαθών',
    'concept-check': 'Έλεγχος Έννοιας',
    'deep-dive': 'Εμβάθυνση',
    'timed-test': 'Χρονομετρημένο Τεστ',
    'self-explanation': 'Αυτο-εξήγηση',
    comparison: 'Σύγκριση',
    'prerequisite-repair': 'Επιδιόρθωση Προαπαιτούμενων',
    'oral-exam': 'Προφορική Εξέταση',
  },
};

const FILTER_LABELS: Record<Lang, Record<TaskFilter, string>> = {
  en: {
    all: 'All',
    learn: 'Learn',
    review: 'Review',
    practice: 'Practice',
    exam: 'Exam',
    fix: 'Fix',
    completed: 'Completed',
  },
  el: {
    all: 'Όλα',
    learn: 'Μάθηση',
    review: 'Επανάληψη',
    practice: 'Εξάσκηση',
    exam: 'Εξέταση',
    fix: 'Διόρθωση',
    completed: 'Ολοκληρωμένα',
  },
};

export function getTasksContent(lang: Lang): TasksContent {
  return lang === 'el' ? EL : EN;
}

export function getTaskTypeLabel(type: TaskType, lang: Lang): string {
  return TASK_TYPE_LABELS[lang === 'el' ? 'el' : 'en'][type];
}

export function getSessionTypes(lang: Lang): SessionTypeEntry[] {
  if (lang === 'el') {
    return [
      { type: '10min', label: 'Γρήγορο Sprint', desc: 'Γρήγορη επανάληψη & flashcards', minutes: 10, icon: Zap },
      { type: '25min', label: 'Focused Session', desc: 'Βαθιά μάθηση & εξάσκηση', minutes: 25, icon: Target },
      { type: '50min', label: 'Deep Session', desc: 'Σύνθετα θέματα & ασκήσεις', minutes: 50, icon: Brain },
      { type: 'cram', label: 'Exam Cram', desc: 'Προτεραιότητα υλικού εξέτασης', minutes: 60, icon: Flame },
      { type: 'review', label: 'Διαστηματική Επανάληψη', desc: 'Due spaced repetitions', minutes: 15, icon: RotateCcw },
    ];
  }
  return [
    { type: '10min', label: 'Quick Sprint', desc: 'Fast review & flashcards', minutes: 10, icon: Zap },
    { type: '25min', label: 'Focused Session', desc: 'Deep learning & practice', minutes: 25, icon: Target },
    { type: '50min', label: 'Deep Session', desc: 'Complex topics & exercises', minutes: 50, icon: Brain },
    { type: 'cram', label: 'Exam Cram', desc: 'Priority exam material', minutes: 60, icon: Flame },
    { type: 'review', label: 'Spaced Review', desc: 'Due spaced repetitions', minutes: 15, icon: RotateCcw },
  ];
}

export function taskFilterLabel(filter: TaskFilter, lang: Lang): string {
  return FILTER_LABELS[lang === 'el' ? 'el' : 'en'][filter];
}

export function studyPlanBlockLabel(
  block: 'mistakes' | 'reviews' | 'weak',
  lang: Lang,
): string {
  const c = getTasksContent(lang);
  switch (block) {
    case 'mistakes':
      return c.studyPlanRetryMistakes;
    case 'reviews':
      return c.studyPlanSpacedReviews;
    case 'weak':
      return c.studyPlanWeakConcepts;
  }
}
