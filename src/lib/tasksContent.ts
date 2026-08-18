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
  pageSubtitle: string;
  startSession: string;
  studyPlanTitle: string;
  progressChrome: string;
  findChrome: string;
  sessionStripTitle: string;
  sessionBandTitle: string;
  hubChromeAria: string;
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
  markResolved: string;
  masteryLabel: string;
  completeTaskAria: (title: string) => string;
  daysAgo: (days: number) => string;
  yesterday: string;
  highPriority: string;
  /** Hint under expanded spaced-repetition / flashcard tasks (L-T02). */
  fsrsReviewHint: string;
  weakAreasEmpty: string;
  entryHint: string;
  sessionActiveBanner: (label: string, current: number, total: number) => string;
  sessionRunningNow: string;
  /** Compact uppercase badge on the running task card (mockup ΤΡΕΧΕΙ). */
  sessionRunningBadge: string;
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
  createPlanCta: string;
  createPlanHint: string;
  helpChrome: string;
  studyPlanLaunchHint: string;
  addTaskCta: string;
  addTaskTitle: string;
  editTaskTitle: string;
  addTaskEyebrow: string;
  taskTitleLabel: string;
  taskDescriptionLabel: string;
  taskCourseLabel: string;
  taskPersonalCourse: string;
  taskCategoryLabel: string;
  taskPriorityLabel: string;
  taskMinutesLabel: string;
  taskDueLabel: string;
  taskTitleRequired: string;
  taskSave: string;
  taskCancel: string;
  taskEdit: string;
  taskDelete: string;
  taskDeleteTitle: string;
  taskDeleteBody: string;
  taskDeleteConfirm: string;
  taskExportIcs: string;
  taskExportIcsAria: (title: string) => string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityCritical: string;
};

const EN: TasksContent = {
  pageTitle: 'What to do next',
  pageSubtitle: 'Start a session — Synapse lines up work from your notes and reviews.',
  startSession: 'Start session',
  studyPlanTitle: "Today's study plan",
  progressChrome: 'Today at a glance',
  findChrome: 'Find tasks',
  sessionStripTitle: 'Start a session',
  sessionBandTitle: 'Your session',
  hubChromeAria: 'Task details',
  dangerZoneTitle: 'Exam is close',
  reviewsDue: (count) => `${count} reviews due`,
  totalMinutes: (minutes) => `${minutes} min total`,
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
  emptyDescription: 'Nothing in this list right now. Try another tab or start a session.',
  showAllTasks: 'Show all tasks',
  sessionTaskCount: (minutes, count) => `${minutes} min · ${count} task${count === 1 ? '' : 's'}`,
  formatSubtitle: (pending, completed, xp) => `${pending} pending · ${completed} done · ${xp} XP available`,
  studyPlanRetryMistakes: 'Retry mistakes',
  studyPlanSpacedReviews: 'Due reviews',
  studyPlanWeakConcepts: 'Weak concepts',
  startPractice: 'Start Practice',
  openWorkspace: 'Open study tools',
  openAgent: 'Ask the tutor',
  startReview: 'Start Review',
  retryMistakes: 'Retry Mistakes',
  startRepair: 'Start Repair',
  startExamPrep: 'Start Exam Prep',
  takeQuiz: 'Take Quiz',
  startLesson: 'Start Lesson',
  generatedLessonTitle: (topic) => `Lesson: ${topic}`,
  generatedWorkspaceTitle: (concept) => `Study: ${concept}`,
  generatedReviewTitle: (topic) => `Review: ${topic}`,
  generatedExamPrepTitle: (courseTitle) => `Exam prep: ${courseTitle}`,
  generatedLessonDesc: (topic) => `Study ${topic} from your uploaded material.`,
  generatedWorkspaceDesc: 'Interactive study — concept map, flashcards, and recall from your notes.',
  generatedReviewDesc: (topic) => `Recall practice for concepts in ${topic}.`,
  generatedExamPrepDesc: 'Review all topics before your exam.',
  courseScopeLabel: (courseName) => `Showing tasks for ${courseName}`,
  showAllCourses: 'Show all courses',
  tabToday: "Today",
  tabWeak: 'Weak spots',
  tabReviews: 'Due reviews',
  tabMistakes: 'Retry mistakes',
  tabTodaySummary: 'What to do today',
  tabWeakSummary: 'Topics that still need another pass',
  tabReviewsSummary: 'Cards and reviews that are due',
  tabMistakesSummary: 'Open errors from recent practice',
  tasksComplete: (done, total) => `${done} of ${total} tasks complete`,
  minRemaining: (min) => `Est. ${min} min remaining`,
  dailyGoal: 'daily goal',
  studyNow: 'Study now',
  askAi: 'Ask tutor',
  practiceOnly: 'Practice only',
  spacedReviewBanner: 'These reviews are due — a short pass now keeps them from slipping.',
  mistakeBanner: 'These mistakes were flagged from recent quizzes. Retry until they stick.',
  streakDays: (days) => `${days}-day streak`,
  recentErrors: (count) => `${count} recent errors`,
  dueLabel: (label) => `Due: ${label}`,
  intervalLabel: (days) => `Interval: ${days}`,
  yourMistake: 'Your mistake',
  correctUnderstanding: 'Correct understanding',
  deepExplanation: 'Deep explanation',
  similarPractice: 'Similar practice',
  markResolved: 'Mark resolved',
  masteryLabel: 'mastery',
  completeTaskAria: (title) => `Complete ${title}`,
  daysAgo: (days) => `${days} days ago`,
  yesterday: 'Yesterday',
  highPriority: 'High priority',
  fsrsReviewHint: 'How well did you remember this — again, hard, good, or easy?',
  weakAreasEmpty: 'No weak spots yet — complete a quiz to see what needs work.',
  entryHint: 'Start a session from the top, or open a task in the list. The queue shows what runs next.',
  sessionActiveBanner: (label, current, total) => `${label} · Task ${current} of ${total}`,
  sessionRunningNow: 'Running now',
  sessionRunningBadge: 'Running',
  sessionUpNext: (title) => `Up next: ${title}`,
  sessionAutoAdvanceHint: 'Finish this task to move to the next one in the session.',
  sessionSectionEyebrow: 'Focused sessions',
  sessionSectionTitle: 'Pick a session length',
  sessionSectionSubtitle: 'Shorter for a quick pass, longer when you have more time.',
  sessionLaunchersToggle: 'Start a focused session',
  dangerZoneBody: (days) =>
    days === 0
      ? 'Your exam is today. Start with the topics that still feel shaky.'
      : `Your exam is ${days} day${days === 1 ? '' : 's'} away. Start with the topics that still feel shaky.`,
  dangerZoneRationale: 'Tasks near the exam, with low mastery or a recent miss, rise to the top.',
  sessionDurationTag: (minutes) => (minutes <= 10 ? 'Fast' : minutes <= 25 ? 'Medium' : minutes <= 50 ? 'Deep' : 'Intense'),
  almostThereTitle: 'Almost there',
  almostThereHint: '1–2 sessions to mastery',
  almostThereCta: 'Practice',
  createPlanCta: 'Start session',
  createPlanHint: 'Starts the recommended session for today.',
  helpChrome: 'How this page works',
  studyPlanLaunchHint: 'Starts a session with this block',
  addTaskCta: 'Add task',
  addTaskTitle: 'New task',
  editTaskTitle: 'Edit task',
  addTaskEyebrow: 'Personal',
  taskTitleLabel: 'Title',
  taskDescriptionLabel: 'Notes',
  taskCourseLabel: 'Course',
  taskPersonalCourse: 'Personal',
  taskCategoryLabel: 'Category',
  taskPriorityLabel: 'Priority',
  taskMinutesLabel: 'Minutes',
  taskDueLabel: 'Due date',
  taskTitleRequired: 'Add a title before saving.',
  taskSave: 'Save task',
  taskCancel: 'Cancel',
  taskEdit: 'Edit',
  taskDelete: 'Delete',
  taskDeleteTitle: 'Delete this task?',
  taskDeleteBody: 'This removes the task from your list. Generated study tasks are not affected.',
  taskDeleteConfirm: 'Delete task',
  taskExportIcs: 'Add to calendar',
  taskExportIcsAria: (title) => `Download calendar file for ${title}`,
  priorityLow: 'Low',
  priorityMedium: 'Medium',
  priorityHigh: 'High',
  priorityCritical: 'Critical',
  recallReminderTitle: 'Recall reminder',
  recallReminderBody: 'You have been reading for a while. Check what you remember.',
  recallReminderCta: 'Quick quiz',
};

const EL: TasksContent = {
  pageTitle: 'Τι να κάνεις μετά',
  pageSubtitle: 'Ξεκίνα συνεδρία — το Synapse βάζει στη σειρά δουλειά από σημειώσεις και επαναλήψεις.',
  startSession: 'Έναρξη συνεδρίας',
  studyPlanTitle: 'Σημερινό πλάνο μελέτης',
  progressChrome: 'Σήμερα με μια ματιά',
  findChrome: 'Βρες εργασίες',
  sessionStripTitle: 'Ξεκίνα συνεδρία',
  sessionBandTitle: 'Η συνεδρία σου',
  hubChromeAria: 'Λεπτομέρειες εργασιών',
  dangerZoneTitle: 'Η εξέταση είναι κοντά',
  reviewsDue: (count) => `${count} επαναλήψεις σε εκκρεμότητα`,
  totalMinutes: (minutes) => `${minutes} λεπτά συνολικά`,
  examToday: 'Εξέταση σήμερα',
  examInDays: (days) => `Εξέταση σε ${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}`,
  noExamDate: 'Δεν έχει οριστεί ημερομηνία εξέτασης',
  spacedRepetition: 'Διαστηματική επανάληψη',
  retention: (percent) => `Διατήρηση: ${percent}%`,
  recallPrompt: 'Πόσο καλά το θυμήθηκες;',
  fsrsAgain: 'Ξανά',
  fsrsHard: 'Δύσκολο',
  fsrsGood: 'Καλά',
  fsrsEasy: 'Εύκολο',
  emptyTitle: 'Όλα έτοιμα!',
  emptyDescription: 'Τίποτα σε αυτή τη λίστα αυτή τη στιγμή. Δοκίμασε άλλη καρτέλα ή ξεκίνα συνεδρία.',
  showAllTasks: 'Εμφάνιση όλων',
  sessionTaskCount: (minutes, count) => `${minutes} λεπ. · ${count} ${count === 1 ? 'εργασία' : 'εργασίες'}`,
  formatSubtitle: (pending, completed, xp) => `${pending} εκκρεμή · ${completed} ολοκληρωμένα · ${xp} XP διαθέσιμα`,
  studyPlanRetryMistakes: 'Επανάληψη λαθών',
  studyPlanSpacedReviews: 'Επαναλήψεις',
  studyPlanWeakConcepts: 'Αδύναμες έννοιες',
  startPractice: 'Έναρξη εξάσκησης',
  openWorkspace: 'Άνοιγμα εργαλείων μελέτης',
  openAgent: 'Ρώτα τον βοηθό',
  startReview: 'Έναρξη επανάληψης',
  retryMistakes: 'Επανάληψη λαθών',
  startRepair: 'Έναρξη επιδιόρθωσης',
  startExamPrep: 'Έναρξη προετοιμασίας',
  takeQuiz: 'Κουίζ',
  startLesson: 'Έναρξη μαθήματος',
  generatedLessonTitle: (topic) => `Μάθημα: ${topic}`,
  generatedWorkspaceTitle: (concept) => `Μελέτη: ${concept}`,
  generatedReviewTitle: (topic) => `Επανάληψη: ${topic}`,
  generatedExamPrepTitle: (courseTitle) => `Προετοιμασία εξέτασης: ${courseTitle}`,
  generatedLessonDesc: (topic) => `Μελέτη ${topic} από το ανεβασμένο υλικό σου.`,
  generatedWorkspaceDesc: 'Διαδραστική μελέτη — χάρτης εννοιών, κάρτες και ανάκληση από τις σημειώσεις σου.',
  generatedReviewDesc: (topic) => `Εξάσκηση ανάκλησης για έννοιες στο ${topic}.`,
  generatedExamPrepDesc: 'Επανάληψη όλων των θεμάτων πριν την εξέταση.',
  courseScopeLabel: (courseName) => `Εργασίες για ${courseName}`,
  showAllCourses: 'Εμφάνιση όλων των μαθημάτων',
  tabToday: 'Σήμερα',
  tabWeak: 'Αδύναμα σημεία',
  tabReviews: 'Επαναλήψεις',
  tabMistakes: 'Επανάληψη λαθών',
  tabTodaySummary: 'Τι να κάνεις σήμερα',
  tabWeakSummary: 'Θέματα που χρειάζονται ακόμα μια επανάληψη',
  tabReviewsSummary: 'Κάρτες και επαναλήψεις που είναι για σήμερα',
  tabMistakesSummary: 'Ανοιχτά λάθη από πρόσφατη εξάσκηση',
  tasksComplete: (done, total) => `${done} από ${total} εργασίες`,
  minRemaining: (min) => `${min} λεπτά απομένουν`,
  dailyGoal: 'ημερήσιος στόχος',
  studyNow: 'Μελέτη τώρα',
  askAi: 'Ρώτα βοηθό',
  practiceOnly: 'Μόνο εξάσκηση',
  spacedReviewBanner: 'Αυτές οι επαναλήψεις είναι για σήμερα — λίγη εξάσκηση τώρα τις κρατά φρέσκες.',
  mistakeBanner: 'Λάθη από πρόσφατα κουίζ. Επανάλαβέ τα μέχρι να «κάτσουν».',
  streakDays: (days) => `${days} μέρες συνέχεια`,
  recentErrors: (count) => `${count} πρόσφατα λάθη`,
  dueLabel: (label) => `Προθεσμία: ${label}`,
  intervalLabel: (days) => `Διάστημα: ${days}`,
  yourMistake: 'Το λάθος σου',
  correctUnderstanding: 'Σωστή κατανόηση',
  deepExplanation: 'Εμβάθυνση',
  similarPractice: 'Παρόμοια άσκηση',
  markResolved: 'Σήμανση ως λυμένο',
  masteryLabel: 'κατάκτηση',
  completeTaskAria: (title) => `Ολοκλήρωση ${title}`,
  daysAgo: (days) => `${days} ημέρες πριν`,
  yesterday: 'Χθες',
  highPriority: 'Υψηλή προτεραιότητα',
  fsrsReviewHint: 'Πόσο καλά το θυμήθηκες — ξανά, δύσκολο, καλά ή εύκολο;',
  weakAreasEmpty: 'Δεν υπάρχουν αδύναμα σημεία — ολοκλήρωσε ένα κουίζ για να δεις τι χρειάζεται δουλειά.',
  entryHint: 'Ξεκίνα συνεδρία από πάνω, ή άνοιξε μια εργασία στη λίστα. Η ουρά δείχνει τι τρέχει μετά.',
  sessionActiveBanner: (label, current, total) => `${label} · Εργασία ${current} από ${total}`,
  sessionRunningNow: 'Τρέχει τώρα',
  sessionRunningBadge: 'Τρέχει',
  sessionUpNext: (title) => `Επόμενο: ${title}`,
  sessionAutoAdvanceHint: 'Ολοκλήρωσε αυτή την εργασία για να περάσεις στην επόμενη της συνεδρίας.',
  sessionSectionEyebrow: 'Εστιασμένες συνεδρίες',
  sessionSectionTitle: 'Διάλεξε διάρκεια συνεδρίας',
  sessionSectionSubtitle: 'Πιο σύντομη για γρήγορο πέρασμα, πιο μεγάλη όταν έχεις χρόνο.',
  sessionLaunchersToggle: 'Έναρξη εστιασμένης συνεδρίας',
  dangerZoneBody: (days) =>
    days === 0
      ? 'Η εξέτασή σου είναι σήμερα. Ξεκίνα από τα θέματα που ακόμα «τρέμουν».'
      : `Η εξέτασή σου είναι σε ${days} ${days === 1 ? 'ημέρα' : 'ημέρες'}. Ξεκίνα από τα θέματα που ακόμα «τρέμουν».`,
  dangerZoneRationale: 'Πιο ψηλά μπαίνουν εργασίες κοντά στην εξέταση, με χαμηλή κατάκτηση ή πρόσφατο λάθος.',
  sessionDurationTag: (minutes) => (minutes <= 10 ? 'Γρήγορο' : minutes <= 25 ? 'Μεσαίο' : minutes <= 50 ? 'Βαθύ' : 'Έντονο'),
  almostThereTitle: 'Σχεδόν εκεί',
  almostThereHint: '1–2 συνεδρίες για κατάκτηση',
  almostThereCta: 'Εξάσκηση',
  createPlanCta: 'Έναρξη συνεδρίας',
  createPlanHint: 'Ξεκινά την προτεινόμενη συνεδρία για σήμερα.',
  helpChrome: 'Πώς δουλεύει αυτή η σελίδα',
  studyPlanLaunchHint: 'Ξεκινά συνεδρία με αυτό το μπλοκ',
  addTaskCta: 'Νέα εργασία',
  addTaskTitle: 'Νέα εργασία',
  editTaskTitle: 'Επεξεργασία εργασίας',
  addTaskEyebrow: 'Προσωπική',
  taskTitleLabel: 'Τίτλος',
  taskDescriptionLabel: 'Σημειώσεις',
  taskCourseLabel: 'Μάθημα',
  taskPersonalCourse: 'Προσωπική',
  taskCategoryLabel: 'Κατηγορία',
  taskPriorityLabel: 'Προτεραιότητα',
  taskMinutesLabel: 'Λεπτά',
  taskDueLabel: 'Προθεσμία',
  taskTitleRequired: 'Πρόσθεσε τίτλο πριν την αποθήκευση.',
  taskSave: 'Αποθήκευση',
  taskCancel: 'Άκυρο',
  taskEdit: 'Επεξεργασία',
  taskDelete: 'Διαγραφή',
  taskDeleteTitle: 'Διαγραφή αυτής της εργασίας;',
  taskDeleteBody: 'Αφαιρείται από τη λίστα σου. Οι αυτόματα παραγόμενες εργασίες δεν επηρεάζονται.',
  taskDeleteConfirm: 'Διαγραφή',
  taskExportIcs: 'Προσθήκη στο ημερολόγιο',
  taskExportIcsAria: (title) => `Λήψη αρχείου ημερολογίου για ${title}`,
  priorityLow: 'Χαμηλή',
  priorityMedium: 'Μεσαία',
  priorityHigh: 'Υψηλή',
  priorityCritical: 'Κρίσιμη',
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
      { type: '10min', label: 'Γρήγορο πέρασμα', desc: 'Γρήγορη επανάληψη και κάρτες', minutes: 10, icon: Zap },
      { type: '25min', label: 'Εστιασμένη συνεδρία', desc: 'Βαθύτερη μάθηση και εξάσκηση', minutes: 25, icon: Target },
      { type: '50min', label: 'Μεγάλη συνεδρία', desc: 'Σύνθετα θέματα και ασκήσεις', minutes: 50, icon: Brain },
      { type: 'cram', label: 'Πριν την εξέταση', desc: 'Προτεραιότητα στο υλικό της εξέτασης', minutes: 60, icon: Flame },
      { type: 'review', label: 'Επαναλήψεις', desc: 'Κάρτες που είναι για σήμερα', minutes: 15, icon: RotateCcw },
    ];
  }
  return [
    { type: '10min', label: 'Quick pass', desc: 'Fast review and flashcards', minutes: 10, icon: Zap },
    { type: '25min', label: 'Focused session', desc: 'Deeper learning and practice', minutes: 25, icon: Target },
    { type: '50min', label: 'Long session', desc: 'Complex topics and exercises', minutes: 50, icon: Brain },
    { type: 'cram', label: 'Before the exam', desc: 'Priority exam material', minutes: 60, icon: Flame },
    { type: 'review', label: 'Due reviews', desc: 'Cards that are due today', minutes: 15, icon: RotateCcw },
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
