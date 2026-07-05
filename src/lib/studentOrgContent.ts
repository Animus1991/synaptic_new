import type { Lang } from './i18n';

export type StudentOrgContent = {
  title: string;
  subtitle: string;
  signInRequired: string;
  signInHint: string;
  samlWelcome: string;
  myClasses: string;
  myClassesHint: string;
  myOrgs: string;
  noClasses: string;
  noOrgs: string;
  colClass: string;
  colAssignments: string;
  colMastery: string;
  colDue: string;
  colOrg: string;
  colRole: string;
  colProgress: string;
  colAvgScore: string;
  refresh: string;
  loading: string;
  openCourse: string;
  filterAllOrgs: string;
  filterByOrg: string;
  statClasses: string;
  statAvgScore: string;
  statCompletion: string;
  statOverdue: string;
  upcomingTitle: string;
  upcomingHint: string;
  assignmentsCount: string;
  calendarTitle: string;
  calendarHint: string;
  calendarFilterAll: string;
  calendarFilterAssignments: string;
  calendarFilterExams: string;
  calendarKindAssignment: string;
  calendarKindExam: string;
  calendarEmpty: string;
};

const EN: StudentOrgContent = {
  title: 'My Institution',
  subtitle: 'Canvas-style dashboard — classes, grades, and upcoming work.',
  signInRequired: 'Sign in to view your institution classes.',
  signInHint: 'Teachers enroll you by email — use the same address in Settings → Proxy account.',
  samlWelcome: 'Signed in via institutional SSO. Your classes are listed below.',
  myClasses: 'My classes',
  myClassesHint: 'Progress, assignments, and grades from your teacher roster.',
  myOrgs: 'Organizations',
  noClasses: 'You are not enrolled in any classes yet.',
  noOrgs: 'No organization memberships found.',
  colClass: 'Class',
  colAssignments: 'Assignments',
  colMastery: 'Mastery',
  colDue: 'Due',
  colOrg: 'Organization',
  colRole: 'Role',
  colProgress: 'Completion',
  colAvgScore: 'Avg score',
  refresh: 'Refresh',
  loading: 'Loading…',
  openCourse: 'Open course',
  filterAllOrgs: 'All organizations',
  filterByOrg: 'Filter by org',
  statClasses: 'Classes',
  statAvgScore: 'Avg score',
  statCompletion: 'Completion',
  statOverdue: 'Overdue',
  upcomingTitle: 'Upcoming & overdue',
  upcomingHint: 'Assignments due in the next 7 days or past due.',
  assignmentsCount: 'assignments',
  calendarTitle: 'Calendar',
  calendarHint: 'Class due dates merged with national exam milestones.',
  calendarFilterAll: 'All',
  calendarFilterAssignments: 'Class work',
  calendarFilterExams: 'Exams',
  calendarKindAssignment: 'Assignment',
  calendarKindExam: 'Exam',
  calendarEmpty: 'No calendar entries in this view.',
};

const EL: StudentOrgContent = {
  title: 'Το ίδρυμά μου',
  subtitle: 'Dashboard τύπου Canvas — τάξεις, βαθμοί και επερχόμενες εργασίες.',
  signInRequired: 'Σύνδεση απαιτείται για τις τάξεις του ιδρύματος.',
  signInHint: 'Οι εκπαιδευτές σε εγγράφουν με email — χρησιμοποίησε το ίδιο στις Ρυθμίσεις.',
  samlWelcome: 'Σύνδεση μέσω institutional SSO. Οι τάξεις σου εμφανίζονται παρακάτω.',
  myClasses: 'Οι τάξεις μου',
  myClassesHint: 'Πρόοδος, εργασίες και βαθμοί από το roster του εκπαιδευτή.',
  myOrgs: 'Οργανισμοί',
  noClasses: 'Δεν είσαι εγγεγραμμένος/η σε τάξη ακόμα.',
  noOrgs: 'Δεν βρέθηκαν συνδέσεις οργανισμού.',
  colClass: 'Τάξη',
  colAssignments: 'Εργασίες',
  colMastery: 'Επίπεδο',
  colDue: 'Προθεσμία',
  colOrg: 'Οργανισμός',
  colRole: 'Ρόλος',
  colProgress: 'Ολοκλήρωση',
  colAvgScore: 'Μ.Ο. βαθμού',
  refresh: 'Ανανέωση',
  loading: 'Φόρτωση…',
  openCourse: 'Άνοιγμα μαθήματος',
  filterAllOrgs: 'Όλοι οι οργανισμοί',
  filterByOrg: 'Φίλτρο οργανισμού',
  statClasses: 'Τάξεις',
  statAvgScore: 'Μ.Ο. βαθμού',
  statCompletion: 'Ολοκλήρωση',
  statOverdue: 'Εκπρόθεσμα',
  upcomingTitle: 'Επερχόμενα & εκπρόθεσμα',
  upcomingHint: 'Εργασίες με προθεσμία τις επόμενες 7 ημέρες ή εκπρόθεσμες.',
  assignmentsCount: 'εργασίες',
  calendarTitle: 'Ημερολόγιο',
  calendarHint: 'Προθεσμίες τάξης μαζί με εξεταστικές ημερομηνίες.',
  calendarFilterAll: 'Όλα',
  calendarFilterAssignments: 'Εργασίες',
  calendarFilterExams: 'Εξετάσεις',
  calendarKindAssignment: 'Εργασία',
  calendarKindExam: 'Εξετάση',
  calendarEmpty: 'Δεν υπάρχουν εγγραφές σε αυτή την προβολή.',
};

export function getStudentOrgContent(lang: Lang): StudentOrgContent {
  return lang === 'el' ? EL : EN;
}
