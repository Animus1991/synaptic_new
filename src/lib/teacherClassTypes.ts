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
