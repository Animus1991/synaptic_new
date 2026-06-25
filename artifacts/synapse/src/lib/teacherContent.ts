import type { Lang } from './i18n';

export type TeacherContent = {
  title: string;
  subtitle: string;
  refresh: string;
  signInRequired: string;
  signInHint: string;
  lastSynced: string;
  courses: string;
  coursesInLibrary: string;
  sourceFiles: string;
  filesUploaded: string;
  topics: string;
  topicsTotal: string;
  glossary: string;
  glossaryEntries: string;
  llmUsageMonth: string;
  requests: string;
  remaining: string;
  serverCapabilities: string;
  courseRoster: string;
  courseRosterHint: string;
  colTitle: string;
  colTopics: string;
  colFiles: string;
  colMastery: string;
  colStatus: string;
  colExam: string;
  openCourse: string;
  noServerCourses: string;
  publishing: string;
  publishingHint: string;
  annotations: string;
  annotatedFiles: string;
  recentAnnotations: string;
  noAnnotations: string;
  localSession: string;
  localSessionHint: string;
  streakDays: string;
  studyHours: string;
  learningEvents: string;
  noEvents: string;
  syncFooter: string;
  loading: string;
  planLabel: string;
};

const EN: TeacherContent = {
  title: 'Teacher Dashboard',
  subtitle: 'Server library, LLM usage, and published annotations for your institution account.',
  refresh: 'Refresh',
  signInRequired: 'Sign in required for the teacher dashboard.',
  signInHint: 'Sign in via Settings → Proxy account to load server usage, quotas, and synced library stats.',
  lastSynced: 'Last synced',
  courses: 'Courses',
  coursesInLibrary: 'in library',
  sourceFiles: 'Source files',
  filesUploaded: 'uploaded',
  topics: 'Topics',
  topicsTotal: 'total',
  glossary: 'Glossary',
  glossaryEntries: 'entries',
  llmUsageMonth: 'LLM usage (month)',
  requests: 'Requests',
  remaining: 'Remaining',
  serverCapabilities: 'Server capabilities',
  courseRoster: 'Course roster',
  courseRosterHint: 'Synced from server library — push from Settings after local uploads.',
  colTitle: 'Title',
  colTopics: 'Topics',
  colFiles: 'Files',
  colMastery: 'Mastery',
  colStatus: 'Status',
  colExam: 'Exam',
  openCourse: 'Open',
  noServerCourses: 'No courses on server yet. Upload material and sync library from Settings.',
  publishing: 'Published annotations',
  publishingHint: 'Highlights and comments pushed to students via shared annotations.',
  annotations: 'annotations',
  annotatedFiles: 'annotated files',
  recentAnnotations: 'Recent',
  noAnnotations: 'No published annotations yet.',
  localSession: 'This device',
  localSessionHint: 'Local learning events and study stats (not yet multi-tenant cohort view).',
  streakDays: 'day streak',
  studyHours: 'study hours',
  learningEvents: 'Learning events',
  noEvents: 'No events yet.',
  syncFooter: 'Live data from GET /v1/teacher/dashboard',
  loading: 'Loading dashboard…',
  planLabel: 'plan',
};

const EL: TeacherContent = {
  title: 'Πίνακας Εκπαιδευτή',
  subtitle: 'Βιβλιοθήκη server, χρήση LLM και δημοσιευμένες σημειώσεις για τον λογαριασμό ιδρύματος.',
  refresh: 'Ανανέωση',
  signInRequired: 'Σύνδεση απαιτείται για τον πίνακα εκπαιδευτή.',
  signInHint: 'Συνδέσου στο proxy από τις Ρυθμίσεις για χρήση, quotas και βιβλιοθήκη server-side.',
  lastSynced: 'Τελευταίος συγχρονισμός',
  courses: 'Μαθήματα',
  coursesInLibrary: 'στη βιβλιοθήκη',
  sourceFiles: 'Αρχεία',
  filesUploaded: 'ανεβασμένα',
  topics: 'Ενότητες',
  topicsTotal: 'συνολικά',
  glossary: 'Γλωσσάρι',
  glossaryEntries: 'όροι',
  llmUsageMonth: 'Χρήση LLM (μήνας)',
  requests: 'Αιτήματα',
  remaining: 'Υπόλοιπο',
  serverCapabilities: 'Δυνατότητες διακομιστή',
  courseRoster: 'Κατάλογος μαθημάτων',
  courseRosterHint: 'Από βιβλιοθήκη server — συγχρόνισε από Ρυθμίσεις μετά από upload.',
  colTitle: 'Τίτλος',
  colTopics: 'Ενότητες',
  colFiles: 'Αρχεία',
  colMastery: 'Επίδοση',
  colStatus: 'Κατάσταση',
  colExam: 'Εξέταση',
  openCourse: 'Άνοιγμα',
  noServerCourses: 'Δεν υπάρχουν μαθήματα στον server. Ανέβασε υλικό και συγχρόνισε από Ρυθμίσεις.',
  publishing: 'Δημοσιευμένες σημειώσεις',
  publishingHint: 'Επισημάνσεις και σχόλια που βλέπουν οι μαθητές.',
  annotations: 'σημειώσεις',
  annotatedFiles: 'αρχεία με σημειώσεις',
  recentAnnotations: 'Πρόσφατα',
  noAnnotations: 'Καμία δημοσιευμένη σημείωση ακόμα.',
  localSession: 'Αυτή η συσκευή',
  localSessionHint: 'Τοπικά learning events και στατιστικά μελέτης (όχι ακόμα cohort πολλών χρηστών).',
  streakDays: 'ημέρες streak',
  studyHours: 'ώρες μελέτης',
  learningEvents: 'Learning events',
  noEvents: 'Κανένα event ακόμα.',
  syncFooter: 'Ζωντανά δεδομένα από GET /v1/teacher/dashboard',
  loading: 'Φόρτωση πίνακα…',
  planLabel: 'πλάνο',
};

export function getTeacherContent(lang: Lang): TeacherContent {
  return lang === 'el' ? EL : EN;
}
