import type { Lang } from './i18n';

import type { UiIconId } from './uiIconRegistry';

export type OnboardingRole = { id: string; label: string; desc: string };
export type OnboardingGoal = { id: string; label: string; icon: UiIconId };
export type OnboardingFeature = { title: string; desc: string };

export type OnboardingContent = {
  welcomeTitle: string;
  welcomeBody: string;
  welcomeFeatureTitle: string;
  nameLabel: string;
  nameOptional: string;
  namePlaceholder: string;
  letsGo: string;
  continueWithoutUpload: string;
  exploreDemoSandbox: string;
  validationRoleRequired: string;
  validationGoalRequired: string;
  validationExamDateRequired: string;
  validationExamDatePast: string;
  teacherPreviewHint: string;
  progressAria: string;
  resumeDraftHint: string;
  roleTitle: string;
  roleSubtitle: string;
  goalsTitle: string;
  goalsSubtitle: string;
  prefsTitle: string;
  prefsSubtitle: string;
  dailyGoal: string;
  upcomingExam: string;
  examDateHint: string;
  summaryTitle: string;
  summaryProfile: string;
  summaryGoals: string;
  summaryDailyGoal: string;
  summaryExamDate: string;
  noExamDate: string;
  examOnlyHint: string;
  beginLearning: string;
  adaptiveHint: string;
  uploadTitle: string;
  uploadBody: string;
  uploadWorkspaceHint: string;
  teacherUploadHint: string;
  teacherDashboardCta: string;
  uploadCta: string;
  back: string;
  continueBtn: string;
  features: OnboardingFeature[];
  roles: OnboardingRole[];
  goals: OnboardingGoal[];
};

const EN: OnboardingContent = {
  welcomeTitle: 'Welcome to Synapse',
  welcomeBody:
    'Upload your notes and Synapse turns them into an adaptive study system with grounded lessons, tasks, and agent help.',
  welcomeFeatureTitle: 'What you unlock',
  nameLabel: 'What should we call you?',
  nameOptional: '(optional)',
  namePlaceholder: 'Your name',
  letsGo: "Let's Go",
  continueWithoutUpload: 'Continue without upload',
  exploreDemoSandbox: 'Explore demo sandbox',
  validationRoleRequired: 'Choose how you will use Synapse to continue.',
  validationGoalRequired: 'Select at least one goal to continue.',
  validationExamDateRequired: 'Add an exam date when exam prep is one of your goals.',
  validationExamDatePast: 'Exam date cannot be in the past.',
  teacherPreviewHint: 'Teacher preview — full publishing requires a verified teacher account.',
  progressAria: 'Onboarding step {current} of {total}',
  resumeDraftHint: 'Continuing where you left off.',
  roleTitle: 'How will you use Synapse?',
  roleSubtitle: 'We will tune your defaults, task mix, and study surfaces around this',
  goalsTitle: 'What are your goals?',
  goalsSubtitle: 'Select all that apply. The first one you pick will influence your default pacing most.',
  prefsTitle: 'Set your study schedule',
  prefsSubtitle: 'Daily goal and exam timing shape your planner, countdowns, and exam-prep suggestions',
  dailyGoal: 'Daily study goal',
  upcomingExam: 'Upcoming exam?',
  examDateHint: 'Set an exam date to unlock countdown-driven planning and readiness tracking.',
  summaryTitle: 'Your personalized setup',
  summaryProfile: 'Profile',
  summaryGoals: 'Goals',
  summaryDailyGoal: 'Daily goal',
  summaryExamDate: 'Exam date',
  noExamDate: 'No exam date set',
  examOnlyHint: 'Exam date is most useful when exam prep is one of your goals.',
  beginLearning: 'Start learning',
  adaptiveHint:
    'The adaptive engine will also learn from your behavior — response time, accuracy, confidence, error patterns — to optimize your path automatically.',
  uploadTitle: "You're All Set!",
  uploadBody: 'Upload your first document to generate an interactive course, or explore the dashboard first.',
  uploadWorkspaceHint: 'After upload, open the course and tap Continue to enter the study workspace.',
  teacherUploadHint: 'As a teacher, publish annotations from the workspace Reader and track courses, usage, and publishing from the Teacher dashboard.',
  teacherDashboardCta: 'Open Teacher Dashboard',
  uploadCta: 'Upload My First Material',
  back: 'Back',
  continueBtn: 'Continue',
  features: [
    { title: 'Upload your notes', desc: 'PDFs, slides, scans, DOCX, and mixed study material.' },
    { title: 'Grounded course generation', desc: 'Lessons, glossary, exercises, and tasks stay tied to your source material.' },
    { title: 'Adaptive exam prep', desc: 'Daily planning, spaced review, and exam readiness respond to your behavior.' },
    { title: '15-mode study agent', desc: 'Switch between Socratic, exam coach, deep theory, writing, coding, and more.' },
  ],
  roles: [
    { id: 'university', label: 'University Student', desc: 'Exam preparation from lecture materials' },
    { id: 'highschool', label: 'High School Student', desc: 'Structured learning and exam prep' },
    { id: 'selflearner', label: 'Self-Learner', desc: 'Learn any subject at your own pace' },
    { id: 'tutor', label: 'Tutor / Teacher', desc: 'Create interactive lessons for students' },
    { id: 'company', label: 'Company / Training', desc: 'Transform documents into training' },
  ],
  goals: [
    { id: 'exam', label: 'Pass an upcoming exam', icon: 'target' },
    { id: 'understand', label: 'Deeply understand material', icon: 'brain' },
    { id: 'review', label: 'Quick review & revision', icon: 'bolt' },
    { id: 'practice', label: 'Get more practice problems', icon: 'strength' },
    { id: 'organize', label: 'Organize & structure my notes', icon: 'books' },
    { id: 'explore', label: 'Explore a new subject', icon: 'search' },
  ],
};

const EL: OnboardingContent = {
  welcomeTitle: 'Καλώς ήρθες στο Synapse',
  welcomeBody:
    'Ανέβασε τις σημειώσεις σου και το Synapse τις μετατρέπει σε προσαρμοστικό σύστημα μελέτης με grounded μαθήματα, εργασίες και agent βοήθεια.',
  welcomeFeatureTitle: 'Τι ξεκλειδώνεις',
  nameLabel: 'Πώς να σε αποκαλούμε;',
  nameOptional: '(προαιρετικό)',
  namePlaceholder: 'Το όνομά σου',
  letsGo: 'Πάμε',
  continueWithoutUpload: 'Συνέχεια χωρίς upload',
  exploreDemoSandbox: 'Δοκίμασε demo sandbox',
  validationRoleRequired: 'Επίλεξε πώς θα χρησιμοποιήσεις το Synapse για να συνεχίσεις.',
  validationGoalRequired: 'Επίλεξε τουλάχιστον έναν στόχο για να συνεχίσεις.',
  validationExamDateRequired: 'Πρόσθεσε ημερομηνία εξέτασης όταν η προετοιμασία εξέτασης είναι στόχος σου.',
  validationExamDatePast: 'Η ημερομηνία εξέτασης δεν μπορεί να είναι στο παρελθόν.',
  teacherPreviewHint: 'Teacher preview — πλήρης δημοσίευση απαιτεί verified λογαριασμό εκπαιδευτή.',
  progressAria: 'Βήμα onboarding {current} από {total}',
  resumeDraftHint: 'Συνεχίζεις από εκεί που σταμάτησες.',
  roleTitle: 'Πώς θα χρησιμοποιήσεις το Synapse;',
  roleSubtitle: 'Θα ρυθμίσουμε τα κατάλληλα defaults, task mix και study surfaces γύρω από αυτό',
  goalsTitle: 'Ποιοι είναι οι στόχοι σου;',
  goalsSubtitle: 'Επίλεξε όσα ισχύουν. Ο πρώτος στόχος επηρεάζει περισσότερο το default pacing.',
  prefsTitle: 'Όρισε το πρόγραμμα μελέτης σου',
  prefsSubtitle: 'Ο ημερήσιος στόχος και η ημερομηνία εξέτασης επηρεάζουν planner, countdowns και exam-prep προτάσεις',
  dailyGoal: 'Ημερήσιος στόχος μελέτης',
  upcomingExam: 'Επερχόμενη εξέταση;',
  examDateHint: 'Όρισε ημερομηνία εξέτασης για countdown-based planning και readiness tracking.',
  summaryTitle: 'Η εξατομικευμένη ρύθμισή σου',
  summaryProfile: 'Προφίλ',
  summaryGoals: 'Στόχοι',
  summaryDailyGoal: 'Ημερήσιος στόχος',
  summaryExamDate: 'Ημερομηνία εξέτασης',
  noExamDate: 'Δεν έχει οριστεί ημερομηνία',
  examOnlyHint: 'Η ημερομηνία εξέτασης είναι πιο χρήσιμη όταν η προετοιμασία εξέτασης είναι βασικός στόχος.',
  beginLearning: 'Ξεκίνα τη μάθηση',
  adaptiveHint:
    'Το προσαρμοστικό σύστημα μαθαίνει από τη συμπεριφορά σου — χρόνο απόκρισης, ακρίβεια, εμπιστοσύνη, μοτίβα λαθών — για να βελτιστοποιεί τη διαδρομή σου.',
  uploadTitle: 'Όλα έτοιμα!',
  uploadBody: 'Ανέβασε το πρώτο σου έγγραφο για διαδραστικό μάθημα ή εξερεύνησε πρώτα τον πίνακα.',
  uploadWorkspaceHint: 'Μετά το upload, άνοιξε το μάθημα και πάτα Continue για τον χώρο μελέτης.',
  teacherUploadHint: 'Ως εκπαιδευτής, δημοσίευσε σχόλια από τον Reader στο workspace και παρακολούθησε μαθήματα, χρήση LLM και δημοσιεύσεις από τον πίνακα Teacher.',
  teacherDashboardCta: 'Άνοιγμα πίνακα Teacher',
  uploadCta: 'Ανέβασμα Πρώτου Υλικού',
  back: 'Πίσω',
  continueBtn: 'Συνέχεια',
  features: [
    { title: 'Ανέβασε τις σημειώσεις σου', desc: 'PDF, slides, scans, DOCX και μικτό υλικό μελέτης.' },
    { title: 'Grounded δημιουργία μαθήματος', desc: 'Μαθήματα, glossary, ασκήσεις και tasks μένουν δεμένα με το υλικό σου.' },
    { title: 'Προσαρμοστική προετοιμασία εξέτασης', desc: 'Daily planning, spaced review και exam readiness προσαρμόζονται στη συμπεριφορά σου.' },
    { title: '15-mode study agent', desc: 'Socratic, exam coach, deep theory, writing, coding και άλλα modes.' },
  ],
  roles: [
    { id: 'university', label: 'Φοιτητής Πανεπιστημίου', desc: 'Προετοιμασία εξετάσεων από διαλέξεις' },
    { id: 'highschool', label: 'Μαθητής Λυκείου', desc: 'Δομημένη μάθηση και εξετάσεις' },
    { id: 'selflearner', label: 'Αυτοδίδακτος', desc: 'Μάθε οτιδήποτε με τον δικό σου ρυθμό' },
    { id: 'tutor', label: 'Καθηγητής / Tutor', desc: 'Διαδραστικά μαθήματα για μαθητές' },
    { id: 'company', label: 'Εταιρεία / Εκπαίδευση', desc: 'Μετατροπή εγγράφων σε training' },
  ],
  goals: [
    { id: 'exam', label: 'Επιτυχία σε επερχόμενη εξέταση', icon: 'target' },
    { id: 'understand', label: 'Βαθιά κατανόηση υλικού', icon: 'brain' },
    { id: 'review', label: 'Γρήγορη επανάληψη', icon: 'bolt' },
    { id: 'practice', label: 'Περισσότερες ασκήσεις', icon: 'strength' },
    { id: 'organize', label: 'Οργάνωση σημειώσεων', icon: 'books' },
    { id: 'explore', label: 'Εξερεύνηση νέου αντικειμένου', icon: 'search' },
  ],
};

export function getOnboardingContent(lang: Lang): OnboardingContent {
  return lang === 'el' ? EL : EN;
}
