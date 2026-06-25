import type { Lang } from './i18n';

export type OnboardingRole = { id: string; label: string; desc: string };
export type OnboardingGoal = { id: string; label: string; icon: string };

export type OnboardingContent = {
  welcomeTitle: string;
  welcomeBody: string;
  nameLabel: string;
  nameOptional: string;
  namePlaceholder: string;
  letsGo: string;
  roleTitle: string;
  roleSubtitle: string;
  goalsTitle: string;
  goalsSubtitle: string;
  prefsTitle: string;
  prefsSubtitle: string;
  dailyGoal: string;
  upcomingExam: string;
  adaptiveHint: string;
  uploadTitle: string;
  uploadBody: string;
  uploadCta: string;
  skipExplore: string;
  back: string;
  continueBtn: string;
  roles: OnboardingRole[];
  goals: OnboardingGoal[];
};

const EN: OnboardingContent = {
  welcomeTitle: 'Welcome to Synapse',
  welcomeBody:
    "Let's personalize your learning experience. This takes about 60 seconds. The adaptive engine will also learn from your behavior over time.",
  nameLabel: 'What should we call you?',
  nameOptional: '(optional)',
  namePlaceholder: 'Your name',
  letsGo: "Let's Go",
  roleTitle: 'How will you use Synapse?',
  roleSubtitle: 'This helps us set up the right defaults',
  goalsTitle: 'What are your goals?',
  goalsSubtitle: 'Select all that apply',
  prefsTitle: 'Quick Preferences',
  prefsSubtitle: 'You can change these anytime in settings',
  dailyGoal: 'Daily study goal',
  upcomingExam: 'Upcoming exam?',
  adaptiveHint:
    'The adaptive engine will also learn from your behavior — response time, accuracy, confidence, error patterns — to optimize your path automatically.',
  uploadTitle: "You're All Set! 🎉",
  uploadBody: 'Upload your first document to generate an interactive course, or explore the dashboard first.',
  uploadCta: 'Upload My First Material',
  skipExplore: 'Skip — explore the demo first',
  back: 'Back',
  continueBtn: 'Continue',
  roles: [
    { id: 'university', label: 'University Student', desc: 'Exam preparation from lecture materials' },
    { id: 'highschool', label: 'High School Student', desc: 'Structured learning and exam prep' },
    { id: 'selflearner', label: 'Self-Learner', desc: 'Learn any subject at your own pace' },
    { id: 'tutor', label: 'Tutor / Teacher', desc: 'Create interactive lessons for students' },
    { id: 'company', label: 'Company / Training', desc: 'Transform documents into training' },
  ],
  goals: [
    { id: 'exam', label: 'Pass an upcoming exam', icon: '🎯' },
    { id: 'understand', label: 'Deeply understand material', icon: '🧠' },
    { id: 'review', label: 'Quick review & revision', icon: '⚡' },
    { id: 'practice', label: 'Get more practice problems', icon: '💪' },
    { id: 'organize', label: 'Organize & structure my notes', icon: '📚' },
    { id: 'explore', label: 'Explore a new subject', icon: '🔍' },
  ],
};

const EL: OnboardingContent = {
  welcomeTitle: 'Καλώς ήρθες στο Synapse',
  welcomeBody:
    'Ας εξατομικεύσουμε την εμπειρία μάθησης. Διαρκεί περίπου 60 δευτερόλεπτα. Το προσαρμοστικό σύστημα μαθαίνει και από τη συμπεριφορά σου με τον χρόνο.',
  nameLabel: 'Πώς να σε αποκαλούμε;',
  nameOptional: '(προαιρετικό)',
  namePlaceholder: 'Το όνομά σου',
  letsGo: 'Πάμε',
  roleTitle: 'Πώς θα χρησιμοποιήσεις το Synapse;',
  roleSubtitle: 'Βοηθάει να ρυθμίσουμε τα σωστά defaults',
  goalsTitle: 'Ποιοι είναι οι στόχοι σου;',
  goalsSubtitle: 'Επίλεξε όσα ισχύουν',
  prefsTitle: 'Γρήγορες Προτιμήσεις',
  prefsSubtitle: 'Μπορείς να τις αλλάξεις ανά πάσα στιγμή στις Ρυθμίσεις',
  dailyGoal: 'Ημερήσιος στόχος μελέτης',
  upcomingExam: 'Επερχόμενη εξέταση;',
  adaptiveHint:
    'Το προσαρμοστικό σύστημα μαθαίνει από τη συμπεριφορά σου — χρόνο απόκρισης, ακρίβεια, εμπιστοσύνη, μοτίβα λαθών — για να βελτιστοποιεί τη διαδρομή σου.',
  uploadTitle: 'Όλα έτοιμα! 🎉',
  uploadBody: 'Ανέβασε το πρώτο σου έγγραφο για διαδραστικό μάθημα ή εξερεύνησε πρώτα τον πίνακα.',
  uploadCta: 'Ανέβασμα Πρώτου Υλικού',
  skipExplore: 'Παράλειψη — εξερεύνησε πρώτα το demo',
  back: 'Πίσω',
  continueBtn: 'Συνέχεια',
  roles: [
    { id: 'university', label: 'Φοιτητής Πανεπιστημίου', desc: 'Προετοιμασία εξετάσεων από διαλέξεις' },
    { id: 'highschool', label: 'Μαθητής Λυκείου', desc: 'Δομημένη μάθηση και εξετάσεις' },
    { id: 'selflearner', label: 'Αυτοδίδακτος', desc: 'Μάθε οτιδήποτε με τον δικό σου ρυθμό' },
    { id: 'tutor', label: 'Καθηγητής / Tutor', desc: 'Διαδραστικά μαθήματα για μαθητές' },
    { id: 'company', label: 'Εταιρεία / Εκπαίδευση', desc: 'Μετατροπή εγγράφων σε training' },
  ],
  goals: [
    { id: 'exam', label: 'Επιτυχία σε επερχόμενη εξέταση', icon: '🎯' },
    { id: 'understand', label: 'Βαθιά κατανόηση υλικού', icon: '🧠' },
    { id: 'review', label: 'Γρήγορη επανάληψη', icon: '⚡' },
    { id: 'practice', label: 'Περισσότερες ασκήσεις', icon: '💪' },
    { id: 'organize', label: 'Οργάνωση σημειώσεων', icon: '📚' },
    { id: 'explore', label: 'Εξερεύνηση νέου αντικειμένου', icon: '🔍' },
  ],
};

export function getOnboardingContent(lang: Lang): OnboardingContent {
  return lang === 'el' ? EL : EN;
}
