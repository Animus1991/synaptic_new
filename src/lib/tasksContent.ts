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
  tabToday: string;
  tabWeak: string;
  tabReviews: string;
  tabMistakes: string;
  tabTodaySummary: string;
  tabWeakSummary: string;
  tabReviewsSummary: string;
  tabMistakesSummary: string;
  tasksComplete: (done: number, total: number) => string;
  minRemaining: (min: number) => string;
  dailyGoal: string;
  studyNow: string;
  askAi: string;
  practiceOnly: string;
  spacedReviewBanner: string;
  mistakeBanner: string;
  streakDays: (days: number) => string;
  recentErrors: (count: number) => string;
  dueLabel: (label: string) => string;
  intervalLabel: (days: string) => string;
  yourMistake: string;
  correctUnderstanding: string;
  deepExplanation: string;
  similarPractice: string;
  daysAgo: (days: number) => string;
  yesterday: string;
  highPriority: string;
  weakAreasEmpty: string;
  entryHint: string;
  sessionActiveBanner: (label: string, current: number, total: number) => string;
  sessionRunningNow: string;
  sessionUpNext: (title: string) => string;
  sessionAutoAdvanceHint: string;
  sessionSectionEyebrow: string;
  sessionSectionTitle: string;
  sessionSectionSubtitle: string;
  sessionLaunchersToggle: string;
  dangerZoneBody: (days: number) => string;
  dangerZoneRationale: string;
  sessionDurationTag: (minutes: number) => string;
  almostThereTitle: string;
  almostThereHint: string;
  almostThereCta: string;
  recallReminderTitle: string;
  recallReminderBody: string;
  recallReminderCta: string;
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
  tabToday: "Today's Plan",
  tabWeak: 'Weak Areas',
  tabReviews: 'Due Reviews',
  tabMistakes: 'Retry Mistakes',
  tabTodaySummary: 'Scheduled work and sessions for today',
  tabWeakSummary: 'Low-mastery concepts that need another pass',
  tabReviewsSummary: 'FSRS due cards and spacing intervals',
  tabMistakesSummary: 'Open errors flagged from recent practice',
  tasksComplete: (done, total) => `${done} of ${total} tasks complete`,
  minRemaining: (min) => `Est. ${min} min remaining`,
  dailyGoal: 'daily goal',
  studyNow: 'Study Now',
  askAi: 'Ask AI',
  practiceOnly: 'Practice Only',
  spacedReviewBanner: 'Spaced repetition schedule — review these concepts before they decay.',
  mistakeBanner: 'These mistakes were flagged from recent quiz and practice answers. Retry until corrected.',
  streakDays: (days) => `${days}-day streak`,
  recentErrors: (count) => `${count} recent errors`,
  dueLabel: (label) => `Due: ${label}`,
  intervalLabel: (days) => `Interval: ${days}`,
  yourMistake: 'Your mistake',
  correctUnderstanding: 'Correct understanding',
  deepExplanation: 'Deep explanation',
  similarPractice: 'Similar practice',
  daysAgo: (days) => `${days} days ago`,
  yesterday: 'Yesterday',
  highPriority: 'High priority',
  weakAreasEmpty: 'No weak areas yet — complete quizzes to build your mastery profile.',
  entryHint: 'Start or resume a task, or launch a focused session — the queue bar shows which task runs next.',
  sessionActiveBanner: (label, current, total) => `${label} · Task ${current} of ${total}`,
  sessionRunningNow: 'Running now',
  sessionUpNext: (title) => `Up next: ${title}`,
  sessionAutoAdvanceHint: 'Finish the current task to auto-advance to the next one in this session.',
  sessionSectionEyebrow: 'Focused sessions',
  sessionSectionTitle: 'Turn study into a queue of precise actions',
  sessionSectionSubtitle: 'Pick a duration — the planner ranks tasks by exam proximity, mastery gap, and forgetting risk.',
  sessionLaunchersToggle: 'Start a focused session',
  dangerZoneBody: (days) =>
    days === 0
      ? 'Your exam is today. The scheduler is prioritizing weak concepts with the highest forgetting risk.'
      : `Your exam is ${days} day${days === 1 ? '' : 's'} away. The scheduler is prioritizing weak concepts with the highest forgetting risk.`,
  dangerZoneRationale: 'Tasks are ranked by exam proximity, mastery gap, confidence mismatch, and last retrieval time.',
  sessionDurationTag: (minutes) => (minutes <= 10 ? 'Fast' : minutes <= 25 ? 'Medium' : minutes <= 50 ? 'Deep' : 'Intense'),
  almostThereTitle: 'Almost there',
  almostThereHint: '1–2 sessions to mastery',
  almostThereCta: 'Practice',
  recallReminderTitle: 'Recall reminder',
  recallReminderBody: 'You have been reading for a while. Check what you remember.',
  recallReminderCta: 'Quick quiz',
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
  tabToday: 'Σημερινό πλάνο',
  tabWeak: 'Αδύναμα σημεία',
  tabReviews: 'Due επαναλήψεις',
  tabMistakes: 'Επανάληψη λαθών',
  tabTodaySummary: 'Προγραμματισμένες εργασίες και sessions για σήμερα',
  tabWeakSummary: 'Έννοιες χαμηλού mastery που χρειάζονται επανάληψη',
  tabReviewsSummary: 'Ληξιπρόθεσμες κάρτες FSRS και διαστήματα',
  tabMistakesSummary: 'Ανοιχτά λάθη από πρόσφατη εξάσκηση',
  tasksComplete: (done, total) => `${done} από ${total} εργασίες`,
  minRemaining: (min) => `~${min} λεπτά απομένουν`,
  dailyGoal: 'ημερήσιος στόχος',
  studyNow: 'Μελέτη τώρα',
  askAi: 'Ρώτα AI',
  practiceOnly: 'Μόνο εξάσκηση',
  spacedReviewBanner: 'Πρόγραμμα spaced repetition — επανάληψε πριν ξεχαστούν.',
  mistakeBanner: 'Λάθη από πρόσφατα quiz/practice. Επανάληψε μέχρι διόρθωσης.',
  streakDays: (days) => `${days} ημέρες streak`,
  recentErrors: (count) => `${count} πρόσφατα λάθη`,
  dueLabel: (label) => `Due: ${label}`,
  intervalLabel: (days) => `Διάστημα: ${days}`,
  yourMistake: 'Το λάθος σου',
  correctUnderstanding: 'Σωστή κατανόηση',
  deepExplanation: 'Εμβάθυνση',
  similarPractice: 'Παρόμοια άσκηση',
  daysAgo: (days) => `${days} ημέρες πριν`,
  yesterday: 'Χθες',
  highPriority: 'Υψηλή προτεραιότητα',
  weakAreasEmpty: 'Δεν υπάρχουν αδύναμα σημεία — ολοκλήρωσε quiz για προφίλ mastery.',
  entryHint: 'Ξεκίνα ή συνέχισε μια εργασία, ή εκκίνησε focused session — η ουρά δείχνει ποια εργασία τρέχει επόμενη.',
  sessionActiveBanner: (label, current, total) => `${label} · Εργασία ${current} από ${total}`,
  sessionRunningNow: 'Τρέχει τώρα',
  sessionUpNext: (title) => `Επόμενο: ${title}`,
  sessionAutoAdvanceHint: 'Ολοκλήρωσε την τρέχουσα εργασία για αυτόματη μετάβαση στην επόμενη της συνεδρίας.',
  sessionSectionEyebrow: 'Εστιασμένες συνεδρίες',
  sessionSectionTitle: 'Μετέτρεψε τη μελέτη σε ουρά ακριβών ενεργειών',
  sessionSectionSubtitle: 'Διάλεξε διάρκεια — ο προγραμματιστής κατατάσσει εργασίες με βάση εγγύτητα εξέτασης, κενό κυριαρχίας και κίνδυνο λήθης.',
  sessionLaunchersToggle: 'Έναρξη εστιασμένης συνεδρίας',
  dangerZoneBody: (days) =>
    days === 0
      ? 'Η εξέτασή σου είναι σήμερα. Ο scheduler δίνει προτεραιότητα σε αδύναμες έννοιες με τον μεγαλύτερο κίνδυνο λήθης.'
      : `Η εξέτασή σου είναι σε ${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}. Ο scheduler δίνει προτεραιότητα σε αδύναμες έννοιες με τον μεγαλύτερο κίνδυνο λήθης.`,
  dangerZoneRationale: 'Τα tasks κατατάσσονται με βάση εγγύτητα εξέτασης, mastery gap, confidence mismatch και τελευταία retrieval.',
  sessionDurationTag: (minutes) => (minutes <= 10 ? 'Fast' : minutes <= 25 ? 'Medium' : minutes <= 50 ? 'Deep' : 'Intense'),
  almostThereTitle: 'Σχεδόν εκεί',
  almostThereHint: '1–2 συνεδρίες για κατάκτηση',
  almostThereCta: 'Εξάσκηση',
  recallReminderTitle: 'Υπενθύμιση ανάκλησης',
  recallReminderBody: 'Διαβάζεις αρκετή ώρα. Ας δούμε τι θυμάσαι.',
  recallReminderCta: 'Γρήγορο κουίζ',
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
