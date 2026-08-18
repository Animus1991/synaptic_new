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
  announcementsTitle: string;
  announcementsHint: string;
  announcementsFilterAll: string;
  announcementsEmpty: string;
  discussionToggle: string;
  discussionHint: string;
  discussionPlaceholder: string;
  discussionPost: string;
  discussionEmpty: string;
  discussionRoleTeacher: string;
  discussionRoleStudent: string;
  discussionReply: string;
  discussionAskPlaceholder: string;
  discussionReplyPlaceholder: string;
  submitToggle: string;
  resubmitToggle: string;
  submitHint: string;
  submitBodyPlaceholder: string;
  submitLinkPlaceholder: string;
  submitCta: string;
  submitSending: string;
  submittedAtLabel: string;
  submitEmptyError: string;
  submitLinkLabel: string;
  submittedWorkLabel: string;
  submitFilesLabel: string;
  submitFilesHint: string;
  submitFileTooLarge: string;
  submitFilesTooMany: string;
  submitRemoveFile: string;
  submittedFilesLabel: string;
  resubmitConfirmTitle: string;
  resubmitConfirmBody: string;
  resubmitConfirmCta: string;
  resubmitConfirmCancel: string;
  openAssignment: string;
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
  announcementsTitle: 'Announcements',
  announcementsHint: 'Updates from your teachers across enrolled classes.',
  announcementsFilterAll: 'All classes',
  announcementsEmpty: 'No announcements yet.',
  discussionToggle: 'Q&A',
  discussionHint: 'Ask your teacher about this assignment',
  discussionPlaceholder: 'Your question…',
  discussionPost: 'Ask',
  discussionEmpty: 'No messages yet.',
  discussionRoleTeacher: 'Teacher',
  discussionRoleStudent: 'You',
  discussionReply: 'Reply',
  discussionAskPlaceholder: 'Ask a question…',
  discussionReplyPlaceholder: 'Write a reply…',
  submitToggle: 'Submit',
  resubmitToggle: 'Resubmit',
  submitHint: 'Your teacher sees the text, link, and files, and the assignment is marked as submitted.',
  submitBodyPlaceholder: 'Write or paste your work…',
  submitLinkPlaceholder: 'Optional link (Google Docs, GitHub, …)',
  submitCta: 'Submit work',
  submitSending: 'Submitting…',
  submittedAtLabel: 'Submitted',
  submitEmptyError: 'Add some text, a link, or a file before submitting.',
  submitLinkLabel: 'Attached link',
  submittedWorkLabel: 'Your submission',
  submitFilesLabel: 'Attach files',
  submitFilesHint: 'PDF, Word, images, or zip — up to 5 files, 4 MB each.',
  submitFileTooLarge: 'Each file must be under 4 MB.',
  submitFilesTooMany: 'You can attach up to 5 files.',
  submitRemoveFile: 'Remove',
  submittedFilesLabel: 'Attached files',
  resubmitConfirmTitle: 'Replace this submission?',
  resubmitConfirmBody:
    'This overwrites the work your teacher already has. If it was graded, they will see a new version to regrade.',
  resubmitConfirmCta: 'Replace submission',
  resubmitConfirmCancel: 'Keep current',
  openAssignment: 'Open assignment',
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
  announcementsTitle: 'Ανακοινώσεις',
  announcementsHint: 'Ενημερώσεις από τους εκπαιδευτές στις τάξεις σου.',
  announcementsFilterAll: 'Όλες οι τάξεις',
  announcementsEmpty: 'Δεν υπάρχουν ανακοινώσεις ακόμα.',
  discussionToggle: 'Q&A',
  discussionHint: 'Ρώτα τον εκπαιδευτή για αυτή την εργασία',
  discussionPlaceholder: 'Η ερώτησή σου…',
  discussionPost: 'Αποστολή',
  discussionEmpty: 'Δεν υπάρχουν μηνύματα ακόμα.',
  discussionRoleTeacher: 'Εκπαιδευτής',
  discussionRoleStudent: 'Εσύ',
  discussionReply: 'Απάντηση',
  discussionAskPlaceholder: 'Κάνε μια ερώτηση…',
  discussionReplyPlaceholder: 'Γράψε απάντηση…',
  submitToggle: 'Υποβολή',
  resubmitToggle: 'Επανυποβολή',
  submitHint: 'Ο εκπαιδευτής βλέπει το κείμενο, τον σύνδεσμο και τα αρχεία, και η εργασία σημειώνεται ως υποβληθείσα.',
  submitBodyPlaceholder: 'Γράψε ή επικόλλησε την εργασία σου…',
  submitLinkPlaceholder: 'Προαιρετικός σύνδεσμος (Google Docs, GitHub, …)',
  submitCta: 'Υποβολή εργασίας',
  submitSending: 'Υποβολή…',
  submittedAtLabel: 'Υποβλήθηκε',
  submitEmptyError: 'Πρόσθεσε κείμενο, σύνδεσμο ή αρχείο πριν την υποβολή.',
  submitLinkLabel: 'Συνημμένος σύνδεσμος',
  submittedWorkLabel: 'Η υποβολή σου',
  submitFilesLabel: 'Επισύναψη αρχείων',
  submitFilesHint: 'PDF, Word, εικόνες ή zip — έως 5 αρχεία, 4 MB το καθένα.',
  submitFileTooLarge: 'Κάθε αρχείο πρέπει να είναι κάτω από 4 MB.',
  submitFilesTooMany: 'Μπορείς να επισυνάψεις έως 5 αρχεία.',
  submitRemoveFile: 'Αφαίρεση',
  submittedFilesLabel: 'Συνημμένα αρχεία',
  resubmitConfirmTitle: 'Αντικατάσταση αυτής της υποβολής;',
  resubmitConfirmBody:
    'Αυτό αντικαθιστά την εργασία που ήδη βλέπει ο εκπαιδευτής. Αν έχει βαθμολογηθεί, θα δει νέα έκδοση για επαναβαθμολόγηση.',
  resubmitConfirmCta: 'Αντικατάσταση',
  resubmitConfirmCancel: 'Διατήρηση',
  openAssignment: 'Άνοιγμα εργασίας',
};

export function getStudentOrgContent(lang: Lang): StudentOrgContent {
  return lang === 'el' ? EL : EN;
}
