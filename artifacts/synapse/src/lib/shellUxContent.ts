import type { Lang } from './i18n';

export type ShellUxContent = {
  quickAccessTitle: string;
  /** OPT-K1 — Cursor-like nav group labels */
  navGroupStudy: string;
  navGroupInsights: string;
  navGroupOrganization: string;
  navGroupAccount: string;
  quickNoteAnalysis: string;
  quickUpload: string;
  quickWorkspace: string;
  quickExam: string;
  activeCourseTitle: string;
  daysToExam: (days: number) => string;
  examToday: string;
  noExamDate: string;
  continueCourse: string;
  percentComplete: (pct: number) => string;
};

const EN: ShellUxContent = {
  quickAccessTitle: 'Quick Access',
  navGroupStudy: 'Study',
  navGroupInsights: 'Insights',
  navGroupOrganization: 'Organization',
  navGroupAccount: 'Account',
  quickNoteAnalysis: 'Note Analysis',
  quickUpload: 'Upload / Generate',
  quickWorkspace: 'Study Workspace',
  quickExam: 'Exam Prep',
  activeCourseTitle: 'Active course',
  daysToExam: (days) => `${days} day${days === 1 ? '' : 's'} to exam`,
  examToday: 'Exam today',
  noExamDate: 'No exam date set',
  continueCourse: 'Continue',
  percentComplete: (pct) => `${pct}% complete`,
};

const EL: ShellUxContent = {
  quickAccessTitle: 'Γρήγορη πρόσβαση',
  navGroupStudy: 'Μελέτη',
  navGroupInsights: 'Ανάλυση',
  navGroupOrganization: 'Οργάνωση',
  navGroupAccount: 'Λογαριασμός',
  quickNoteAnalysis: 'Ανάλυση σημειώσεων',
  quickUpload: 'Ανέβασμα / Δημιουργία',
  quickWorkspace: 'Χώρος μελέτης',
  quickExam: 'Προετοιμασία εξέτασης',
  activeCourseTitle: 'Ενεργό μάθημα',
  daysToExam: (days) => `${days} ${days === 1 ? 'ημέρα' : 'ημέρες'} μέχρι την εξέταση`,
  examToday: 'Εξέταση σήμερα',
  noExamDate: 'Δεν έχει οριστεί ημερομηνία εξέτασης',
  continueCourse: 'Συνέχεια',
  percentComplete: (pct) => `${pct}% ολοκληρωμένο`,
};

export function getShellUxContent(lang: Lang): ShellUxContent {
  return lang === 'el' ? EL : EN;
}
