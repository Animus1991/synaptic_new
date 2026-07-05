import type { Lang } from './i18n';

export type TeacherContent = {
  title: string;
  subtitle: string;
  refresh: string;
  signInRequired: string;
  signInHint: string;
  openSettingsCta: string;
  cohortRoadmap: string;
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
  activityOne: string;
  activityMany: string;
  learningEvents: string;
  noEvents: string;
  syncFooter: string;
  loading: string;
  planLabel: string;
  classRosters: string;
  classRostersHint: string;
  createClass: string;
  classNamePlaceholder: string;
  addStudent: string;
  studentEmailPlaceholder: string;
  studentNamePlaceholder: string;
  colStudent: string;
  colEmail: string;
  colEnrolled: string;
  removeStudent: string;
  noClasses: string;
  noStudents: string;
  selectClass: string;
  assignments: string;
  assignmentsHint: string;
  assignmentTitlePlaceholder: string;
  assignmentDuePlaceholder: string;
  createAssignment: string;
  colDue: string;
  removeAssignment: string;
  noAssignments: string;
  announcements: string;
  announcementsHint: string;
  announcementTitlePlaceholder: string;
  announcementBodyPlaceholder: string;
  createAnnouncement: string;
  removeAnnouncement: string;
  noAnnouncements: string;
  discussionToggle: string;
  discussionHint: string;
  discussionPlaceholder: string;
  discussionPost: string;
  discussionEmpty: string;
  discussionRoleTeacher: string;
  discussionRoleStudent: string;
  removeDiscussionPost: string;
  ltiRosterTitle: string;
  ltiRosterHint: string;
  ltiRosterContextPlaceholder: string;
  ltiRosterLink: string;
  ltiRosterSync: string;
  ltiRosterLinked: string;
  ltiRosterSyncDone: string;
  ltiLaunchWelcome: string;
  gradebook: string;
  gradebookHint: string;
  gradebookEmpty: string;
  gradebookScorePlaceholder: string;
  colOverallMastery: string;
  cohortAnalytics: string;
  cohortStudents: string;
  cohortCompletion: string;
  cohortAvgMastery: string;
  cohortAvgScore: string;
  exportGradebookCsv: string;
  ltiPassbackGrades: string;
  ltiPassbackDone: string;
  noOrgAnalytics: string;
};

const EN: TeacherContent = {
  title: 'Teacher Dashboard',
  subtitle: 'Server library, LLM usage, and published annotations for your institution account.',
  refresh: 'Refresh',
  signInRequired: 'Sign in required for the teacher dashboard.',
  signInHint: 'Sign in via Settings → Proxy account to load server usage, quotas, and synced library stats.',
  openSettingsCta: 'Open Settings to sign in',
  cohortRoadmap: 'Manage class rosters and assignments below. Cohort analytics load when you belong to an organization.',
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
  activityOne: 'activity',
  activityMany: 'activities',
  learningEvents: 'Learning events',
  noEvents: 'No events yet.',
  syncFooter: 'Live data from GET /v1/teacher/dashboard',
  loading: 'Loading dashboard…',
  planLabel: 'plan',
  classRosters: 'Class rosters',
  classRostersHint: 'Create a class bucket and enroll students by email (dev in-memory store).',
  createClass: 'Create class',
  classNamePlaceholder: 'Class name',
  addStudent: 'Add student',
  studentEmailPlaceholder: 'student@school.edu',
  studentNamePlaceholder: 'Display name (optional)',
  colStudent: 'Student',
  colEmail: 'Email',
  colEnrolled: 'Enrolled',
  removeStudent: 'Remove',
  noClasses: 'No classes yet — create one to start a roster.',
  noStudents: 'No students enrolled in this class.',
  selectClass: 'Select a class',
  assignments: 'Assignments',
  assignmentsHint: 'Set titles and due dates for this class. Stored on the teacher server (in-memory dev store).',
  assignmentTitlePlaceholder: 'Assignment title',
  assignmentDuePlaceholder: 'Due date (YYYY-MM-DD)',
  createAssignment: 'Create assignment',
  colDue: 'Due',
  removeAssignment: 'Remove',
  noAssignments: 'No assignments for this class yet.',
  announcements: 'Announcements',
  announcementsHint: 'Post updates to enrolled students — shown in their institution feed.',
  announcementTitlePlaceholder: 'Announcement title',
  announcementBodyPlaceholder: 'Message to the class…',
  createAnnouncement: 'Post announcement',
  removeAnnouncement: 'Remove',
  noAnnouncements: 'No announcements for this class yet.',
  discussionToggle: 'Q&A',
  discussionHint: 'Per-assignment questions and answers',
  discussionPlaceholder: 'Reply to the class…',
  discussionPost: 'Post',
  discussionEmpty: 'No questions yet.',
  discussionRoleTeacher: 'Teacher',
  discussionRoleStudent: 'Student',
  removeDiscussionPost: 'Remove',
  ltiRosterTitle: 'LTI roster sync',
  ltiRosterHint: 'Link a Canvas course context, then import learners via NRPS (or demo stub after LTI launch).',
  ltiRosterContextPlaceholder: 'LTI context ID (Canvas course)',
  ltiRosterLink: 'Link context',
  ltiRosterSync: 'Sync roster',
  ltiRosterLinked: 'LTI context linked to this class.',
  ltiRosterSyncDone: 'Roster synced',
  ltiLaunchWelcome: 'Signed in via LTI deep link',
  gradebook: 'Gradebook',
  gradebookHint: 'Enter scores (0–100) per student and assignment. Saved to the teacher server.',
  gradebookEmpty: 'Add students and assignments to use the gradebook matrix.',
  gradebookScorePlaceholder: '—',
  colOverallMastery: 'Overall',
  cohortAnalytics: 'Cohort analytics',
  cohortStudents: 'Students',
  cohortCompletion: 'Completion',
  cohortAvgMastery: 'Avg mastery',
  cohortAvgScore: 'Avg score',
  exportGradebookCsv: 'Export CSV',
  ltiPassbackGrades: 'LTI passback',
  ltiPassbackDone: 'Grades queued for LMS',
  noOrgAnalytics: 'Create an organization (org_admin) to view cohort analytics.',
};

const EL: TeacherContent = {
  title: 'Πίνακας Εκπαιδευτή',
  subtitle: 'Βιβλιοθήκη server, χρήση LLM και δημοσιευμένες σημειώσεις για τον λογαριασμό ιδρύματος.',
  refresh: 'Ανανέωση',
  signInRequired: 'Σύνδεση απαιτείται για τον πίνακα εκπαιδευτή.',
  signInHint: 'Συνδέσου στο proxy από τις Ρυθμίσεις για χρήση, quotas και βιβλιοθήκη server-side.',
  openSettingsCta: 'Άνοιγμα Ρυθμίσεων για σύνδεση',
  cohortRoadmap: 'Διαχειρίσου καταλόγους τάξεων και αναθέσεις παρακάτω. Cohort analytics φορτώνονται όταν ανήκεις σε οργανισμό.',
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
  activityOne: 'δραστηριότητα',
  activityMany: 'δραστηριότητες',
  learningEvents: 'Learning events',
  noEvents: 'Κανένα event ακόμα.',
  syncFooter: 'Ζωντανά δεδομένα από GET /v1/teacher/dashboard',
  loading: 'Φόρτωση πίνακα…',
  planLabel: 'πλάνο',
  classRosters: 'Κατάλογοι τάξεων',
  classRostersHint: 'Δημιούργησε τάξη και πρόσθεσε μαθητές με email (dev in-memory store).',
  createClass: 'Νέα τάξη',
  classNamePlaceholder: 'Όνομα τάξης',
  addStudent: 'Προσθήκη μαθητή',
  studentEmailPlaceholder: 'mathitis@school.edu',
  studentNamePlaceholder: 'Όνομα (προαιρετικό)',
  colStudent: 'Μαθητής',
  colEmail: 'Email',
  colEnrolled: 'Εγγραφή',
  removeStudent: 'Αφαίρεση',
  noClasses: 'Δεν υπάρχουν τάξεις — δημιούργησε μία για κατάλογο.',
  noStudents: 'Δεν υπάρχουν μαθητές σε αυτή την τάξη.',
  selectClass: 'Επίλεξε τάξη',
  assignments: 'Αναθέσεις',
  assignmentsHint: 'Τίτλοι και deadlines για την τάξη (teacher server, in-memory dev store).',
  assignmentTitlePlaceholder: 'Τίτλος ανάθεσης',
  assignmentDuePlaceholder: 'Προθεσμία (YYYY-MM-DD)',
  createAssignment: 'Νέα ανάθεση',
  colDue: 'Προθεσμία',
  removeAssignment: 'Αφαίρεση',
  noAssignments: 'Δεν υπάρχουν αναθέσεις για αυτή την τάξη.',
  announcements: 'Ανακοινώσεις',
  announcementsHint: 'Δημοσίευσε ενημερώσεις για τους εγγεγραμμένους μαθητές — εμφανίζονται στο institution feed.',
  announcementTitlePlaceholder: 'Τίτλος ανακοίνωσης',
  announcementBodyPlaceholder: 'Μήνυμα προς την τάξη…',
  createAnnouncement: 'Δημοσίευση',
  removeAnnouncement: 'Αφαίρεση',
  noAnnouncements: 'Δεν υπάρχουν ανακοινώσεις για αυτή την τάξη.',
  discussionToggle: 'Q&A',
  discussionHint: 'Ερωτήσεις και απαντήσεις ανά εργασία',
  discussionPlaceholder: 'Απάντηση στην τάξη…',
  discussionPost: 'Αποστολή',
  discussionEmpty: 'Δεν υπάρχουν ερωτήσεις ακόμα.',
  discussionRoleTeacher: 'Εκπαιδευτής',
  discussionRoleStudent: 'Μαθητής',
  removeDiscussionPost: 'Αφαίρεση',
  ltiRosterTitle: 'LTI roster sync',
  ltiRosterHint: 'Σύνδεσε Canvas context και εισαγωγή μαθητών μέσω NRPS (ή demo stub μετά από LTI launch).',
  ltiRosterContextPlaceholder: 'LTI context ID (Canvas course)',
  ltiRosterLink: 'Σύνδεση context',
  ltiRosterSync: 'Συγχρονισμός roster',
  ltiRosterLinked: 'Το LTI context συνδέθηκε με αυτή την τάξη.',
  ltiRosterSyncDone: 'Roster συγχρονίστηκε',
  ltiLaunchWelcome: 'Σύνδεση μέσω LTI deep link',
  gradebook: 'Βαθμολόγιο',
  gradebookHint: 'Βαθμοί (0–100) ανά μαθητή και ανάθεση. Αποθηκεύονται στον teacher server.',
  gradebookEmpty: 'Πρόσθεσε μαθητές και αναθέσεις για τον πίνακα βαθμολογίου.',
  gradebookScorePlaceholder: '—',
  colOverallMastery: 'Συνολική',
  cohortAnalytics: 'Cohort analytics',
  cohortStudents: 'Μαθητές',
  cohortCompletion: 'Ολοκλήρωση',
  cohortAvgMastery: 'Μ.Ο. επίδοσης',
  cohortAvgScore: 'Μ.Ο. βαθμού',
  exportGradebookCsv: 'Εξαγωγή CSV',
  ltiPassbackGrades: 'LTI passback',
  ltiPassbackDone: 'Βαθμοί στην ουρά LMS',
  noOrgAnalytics: 'Δημιούργησε οργανισμό (org_admin) για cohort analytics.',
};

export function getTeacherContent(lang: Lang): TeacherContent {
  return lang === 'el' ? EL : EN;
}
