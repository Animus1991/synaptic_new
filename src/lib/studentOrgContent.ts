import type { Lang } from './i18n';

export type StudentOrgContent = {
  title: string;
  subtitle: string;
  signInRequired: string;
  signInHint: string;
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
  refresh: string;
  loading: string;
  openCourse: string;
};

const EN: StudentOrgContent = {
  title: 'My Institution',
  subtitle: 'Classes and org memberships linked to your account email.',
  signInRequired: 'Sign in to view your institution classes.',
  signInHint: 'Teachers enroll you by email — use the same address in Settings → Proxy account.',
  myClasses: 'My classes',
  myClassesHint: 'Assignments and grades synced from your teacher\'s class roster.',
  myOrgs: 'Organizations',
  noClasses: 'You are not enrolled in any classes yet.',
  noOrgs: 'No organization memberships found.',
  colClass: 'Class',
  colAssignments: 'Assignments',
  colMastery: 'Mastery',
  colDue: 'Due',
  colOrg: 'Organization',
  colRole: 'Role',
  refresh: 'Refresh',
  loading: 'Loading…',
  openCourse: 'Open course',
};

const EL: StudentOrgContent = {
  title: 'Το ίδρυμά μου',
  subtitle: 'Τάξεις και οργανισμοί συνδεδεμένοι με το email του λογαριασμού σου.',
  signInRequired: 'Σύνδεση απαιτείται για τις τάξεις του ιδρύματος.',
  signInHint: 'Οι εκπαιδευτές σε εγγράφουν με email — χρησιμοποίησε το ίδιο στις Ρυθμίσεις.',
  myClasses: 'Οι τάξεις μου',
  myClassesHint: 'Εργασίες και βαθμοί από το roster του εκπαιδευτή.',
  myOrgs: 'Οργανισμοί',
  noClasses: 'Δεν είσαι εγγεγραμμένος/η σε τάξη ακόμα.',
  noOrgs: 'Δεν βρέθηκαν συνδέσεις οργανισμού.',
  colClass: 'Τάξη',
  colAssignments: 'Εργασίες',
  colMastery: 'Επίπεδο',
  colDue: 'Προθεσμία',
  colOrg: 'Οργανισμός',
  colRole: 'Ρόλος',
  refresh: 'Ανανέωση',
  loading: 'Φόρτωση…',
  openCourse: 'Άνοιγμα μαθήματος',
};

export function getStudentOrgContent(lang: Lang): StudentOrgContent {
  return lang === 'el' ? EL : EN;
}
