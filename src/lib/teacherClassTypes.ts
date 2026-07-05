export type TeacherClassRow = {
  id: string;
  teacherAccountId: string;
  name: string;
  courseId?: string;
  createdAt: string;
  studentCount?: number;
};

export type ClassEnrollmentRow = {
  id: string;
  classId: string;
  studentEmail: string;
  displayName?: string;
  mastery?: number;
  lastActive?: string;
  enrolledAt: string;
};

export type TeacherClassesResponse = {
  classes: TeacherClassRow[];
};

export type ClassRosterResponse = {
  class: TeacherClassRow;
  roster: ClassEnrollmentRow[];
};

export type AssignmentRow = {
  id: string;
  classId: string;
  title: string;
  description?: string;
  dueAt?: string;
  courseId?: string;
  createdAt: string;
};

export type AssignmentsResponse = {
  classId: string;
  assignments: AssignmentRow[];
};

export type AnnouncementRow = {
  id: string;
  classId: string;
  title: string;
  body: string;
  authorAccountId: string;
  createdAt: string;
};

export type AnnouncementsResponse = {
  classId: string;
  announcements: AnnouncementRow[];
};

export type StudentAnnouncementRow = AnnouncementRow & {
  className: string;
};

export type StudentAnnouncementsResponse = {
  email: string;
  announcements: StudentAnnouncementRow[];
};

export type GradebookCellStatus = 'pending' | 'submitted' | 'graded';

export type GradebookCellRow = {
  enrollmentId: string;
  assignmentId: string;
  status: GradebookCellStatus;
  score?: number;
  updatedAt: string;
};

export type GradebookResponse = {
  classId: string;
  roster: ClassEnrollmentRow[];
  assignments: AssignmentRow[];
  cells: GradebookCellRow[];
};
