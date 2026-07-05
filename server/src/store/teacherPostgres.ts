import pg from 'pg';
import type { ClassAnnouncement } from './announcementStore';
import type { ClassAssignment } from './assignmentStore';
import type { TeacherClass, ClassEnrollment } from './classStore';
import type { GradebookCell, GradebookCellStatus, GradebookSnapshot } from './gradebookStore';

const { Pool } = pg;

export interface TeacherRepository {
  listTeacherClasses(teacherAccountId: string): Promise<TeacherClass[]>;
  createTeacherClass(
    teacherAccountId: string,
    payload: { name: string; courseId?: string; orgId?: string },
  ): Promise<TeacherClass>;
  getTeacherClass(classId: string, teacherAccountId: string): Promise<TeacherClass | null>;
  getClassById(classId: string): Promise<TeacherClass | null>;
  listOrgClasses(orgId: string): Promise<TeacherClass[]>;
  rosterCount(classId: string): Promise<number>;
  listClassRoster(classId: string): Promise<ClassEnrollment[]>;
  addClassEnrollment(
    classId: string,
    payload: { email: string; displayName?: string; mastery?: number },
  ): Promise<ClassEnrollment | null>;
  removeClassEnrollment(classId: string, enrollmentId: string): Promise<boolean>;
  listClassAssignments(classId: string): Promise<ClassAssignment[]>;
  createClassAssignment(
    classId: string,
    payload: { title: string; description?: string; dueAt?: string; courseId?: string },
  ): Promise<ClassAssignment>;
  updateClassAssignment(
    classId: string,
    assignmentId: string,
    patch: Partial<Pick<ClassAssignment, 'title' | 'description' | 'dueAt' | 'courseId'>>,
  ): Promise<ClassAssignment | null>;
  removeClassAssignment(classId: string, assignmentId: string): Promise<boolean>;
  getGradebook(classId: string): Promise<GradebookSnapshot>;
  upsertGradebookCell(
    classId: string,
    payload: {
      enrollmentId: string;
      assignmentId: string;
      status?: GradebookCellStatus;
      score?: number;
    },
  ): Promise<GradebookCell>;
  removeGradebookCellsForEnrollment(classId: string, enrollmentId: string): Promise<void>;
  removeGradebookCellsForAssignment(classId: string, assignmentId: string): Promise<void>;
  listClassAnnouncements(classId: string): Promise<ClassAnnouncement[]>;
  createClassAnnouncement(
    classId: string,
    payload: { title: string; body: string; authorAccountId: string },
  ): Promise<ClassAnnouncement>;
  removeClassAnnouncement(classId: string, announcementId: string): Promise<boolean>;
  listStudentEnrollments(studentEmail: string): Promise<
    { enrollment: ClassEnrollment; class: TeacherClass }[]
  >;
}

function rowToClass(row: {
  id: string;
  teacher_account_id: string;
  org_id: string | null;
  name: string;
  course_id: string | null;
  created_at: Date;
}): TeacherClass {
  return {
    id: row.id,
    teacherAccountId: row.teacher_account_id,
    orgId: row.org_id ?? undefined,
    name: row.name,
    courseId: row.course_id ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

function rowToEnrollment(row: {
  id: string;
  class_id: string;
  student_email: string;
  display_name: string | null;
  mastery: number | null;
  last_active: Date | null;
  enrolled_at: Date;
}): ClassEnrollment {
  return {
    id: row.id,
    classId: row.class_id,
    studentEmail: row.student_email,
    displayName: row.display_name ?? undefined,
    mastery: row.mastery ?? undefined,
    lastActive: row.last_active?.toISOString(),
    enrolledAt: row.enrolled_at.toISOString(),
  };
}

function rowToAnnouncement(row: {
  id: string;
  class_id: string;
  author_account_id: string;
  title: string;
  body: string;
  created_at: Date;
}): ClassAnnouncement {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    body: row.body,
    authorAccountId: row.author_account_id,
    createdAt: row.created_at.toISOString(),
  };
}

function rowToAssignment(row: {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  course_id: string | null;
  created_at: Date;
}): ClassAssignment {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    description: row.description ?? undefined,
    dueAt: row.due_at ?? undefined,
    courseId: row.course_id ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

function rowToGradebookCell(row: {
  enrollment_id: string;
  assignment_id: string;
  status: string;
  score: number | null;
  updated_at: Date;
}): GradebookCell {
  return {
    enrollmentId: row.enrollment_id,
    assignmentId: row.assignment_id,
    status: row.status as GradebookCellStatus,
    score: row.score ?? undefined,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function createPostgresTeacherRepo(databaseUrl: string): TeacherRepository {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    async listTeacherClasses(teacherAccountId: string): Promise<TeacherClass[]> {
      const res = await pool.query<{
        id: string;
        teacher_account_id: string;
        org_id: string | null;
        name: string;
        course_id: string | null;
        created_at: Date;
      }>(
        `SELECT id, teacher_account_id, org_id, name, course_id, created_at
         FROM teacher_classes
         WHERE teacher_account_id = $1
         ORDER BY created_at DESC`,
        [teacherAccountId],
      );
      return res.rows.map(rowToClass);
    },

    async createTeacherClass(
      teacherAccountId: string,
      payload: { name: string; courseId?: string; orgId?: string },
    ): Promise<TeacherClass> {
      const id = `cls_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO teacher_classes (id, teacher_account_id, org_id, name, course_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
        [
          id,
          teacherAccountId,
          payload.orgId?.trim() || null,
          payload.name.trim() || 'Untitled class',
          payload.courseId?.trim() || null,
          createdAt,
        ],
      );
      return {
        id,
        teacherAccountId,
        orgId: payload.orgId?.trim() || undefined,
        name: payload.name.trim() || 'Untitled class',
        courseId: payload.courseId?.trim() || undefined,
        createdAt,
      };
    },

    async getClassById(classId: string): Promise<TeacherClass | null> {
      const res = await pool.query<{
        id: string;
        teacher_account_id: string;
        org_id: string | null;
        name: string;
        course_id: string | null;
        created_at: Date;
      }>(
        `SELECT id, teacher_account_id, org_id, name, course_id, created_at
         FROM teacher_classes WHERE id = $1`,
        [classId],
      );
      if (res.rowCount === 0) return null;
      return rowToClass(res.rows[0]!);
    },

    async listOrgClasses(orgId: string): Promise<TeacherClass[]> {
      const res = await pool.query<{
        id: string;
        teacher_account_id: string;
        org_id: string | null;
        name: string;
        course_id: string | null;
        created_at: Date;
      }>(
        `SELECT id, teacher_account_id, org_id, name, course_id, created_at
         FROM teacher_classes WHERE org_id = $1 ORDER BY created_at DESC`,
        [orgId],
      );
      return res.rows.map(rowToClass);
    },

    async getTeacherClass(classId: string, teacherAccountId: string): Promise<TeacherClass | null> {
      const res = await pool.query<{
        id: string;
        teacher_account_id: string;
        org_id: string | null;
        name: string;
        course_id: string | null;
        created_at: Date;
      }>(
        `SELECT id, teacher_account_id, org_id, name, course_id, created_at
         FROM teacher_classes
         WHERE id = $1 AND teacher_account_id = $2`,
        [classId, teacherAccountId],
      );
      if (res.rowCount === 0) return null;
      return rowToClass(res.rows[0]!);
    },

    async rosterCount(classId: string): Promise<number> {
      const res = await pool.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM class_enrollments WHERE class_id = $1',
        [classId],
      );
      return Number(res.rows[0]?.count ?? 0);
    },

    async listClassRoster(classId: string): Promise<ClassEnrollment[]> {
      const res = await pool.query<{
        id: string;
        class_id: string;
        student_email: string;
        display_name: string | null;
        mastery: number | null;
        last_active: Date | null;
        enrolled_at: Date;
      }>(
        `SELECT id, class_id, student_email, display_name, mastery, last_active, enrolled_at
         FROM class_enrollments
         WHERE class_id = $1
         ORDER BY enrolled_at ASC`,
        [classId],
      );
      return res.rows.map(rowToEnrollment);
    },

    async addClassEnrollment(
      classId: string,
      payload: { email: string; displayName?: string; mastery?: number },
    ): Promise<ClassEnrollment | null> {
      const email = payload.email.trim().toLowerCase();
      if (!email) return null;

      const existing = await pool.query<{ id: string }>(
        'SELECT id FROM class_enrollments WHERE class_id = $1 AND student_email = $2',
        [classId, email],
      );
      if ((existing.rowCount ?? 0) > 0) {
        const roster = await this.listClassRoster(classId);
        return roster.find((e) => e.studentEmail === email) ?? null;
      }

      const id = `enr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      await pool.query(
        `INSERT INTO class_enrollments
           (id, class_id, student_email, display_name, mastery, last_active, enrolled_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)`,
        [
          id,
          classId,
          email,
          payload.displayName?.trim() || null,
          payload.mastery ?? null,
          now,
          now,
        ],
      );
      return {
        id,
        classId,
        studentEmail: email,
        displayName: payload.displayName?.trim() || undefined,
        mastery: payload.mastery,
        lastActive: now,
        enrolledAt: now,
      };
    },

    async removeClassEnrollment(classId: string, enrollmentId: string): Promise<boolean> {
      const res = await pool.query(
        'DELETE FROM class_enrollments WHERE class_id = $1 AND id = $2',
        [classId, enrollmentId],
      );
      return (res.rowCount ?? 0) > 0;
    },

    async listClassAssignments(classId: string): Promise<ClassAssignment[]> {
      const res = await pool.query<{
        id: string;
        class_id: string;
        title: string;
        description: string | null;
        due_at: string | null;
        course_id: string | null;
        created_at: Date;
      }>(
        `SELECT id, class_id, title, description, due_at, course_id, created_at
         FROM class_assignments
         WHERE class_id = $1
         ORDER BY created_at DESC`,
        [classId],
      );
      return res.rows.map(rowToAssignment);
    },

    async createClassAssignment(
      classId: string,
      payload: { title: string; description?: string; dueAt?: string; courseId?: string },
    ): Promise<ClassAssignment> {
      const id = `asg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO class_assignments
           (id, class_id, title, description, due_at, course_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
        [
          id,
          classId,
          payload.title.trim() || 'Untitled assignment',
          payload.description?.trim() || null,
          payload.dueAt?.trim() || null,
          payload.courseId?.trim() || null,
          createdAt,
        ],
      );
      return {
        id,
        classId,
        title: payload.title.trim() || 'Untitled assignment',
        description: payload.description?.trim() || undefined,
        dueAt: payload.dueAt?.trim() || undefined,
        courseId: payload.courseId?.trim() || undefined,
        createdAt,
      };
    },

    async updateClassAssignment(
      classId: string,
      assignmentId: string,
      patch: Partial<Pick<ClassAssignment, 'title' | 'description' | 'dueAt' | 'courseId'>>,
    ): Promise<ClassAssignment | null> {
      const current = await pool.query<{
        id: string;
        class_id: string;
        title: string;
        description: string | null;
        due_at: string | null;
        course_id: string | null;
        created_at: Date;
      }>(
        'SELECT id, class_id, title, description, due_at, course_id, created_at FROM class_assignments WHERE class_id = $1 AND id = $2',
        [classId, assignmentId],
      );
      if (current.rowCount === 0) return null;
      const row = current.rows[0]!;
      const next = {
        title: patch.title?.trim() ? patch.title.trim() : row.title,
        description:
          patch.description !== undefined ? (patch.description.trim() || null) : row.description,
        dueAt: patch.dueAt !== undefined ? (patch.dueAt.trim() || null) : row.due_at,
        courseId: patch.courseId !== undefined ? (patch.courseId.trim() || null) : row.course_id,
      };
      await pool.query(
        `UPDATE class_assignments
         SET title = $3, description = $4, due_at = $5, course_id = $6
         WHERE class_id = $1 AND id = $2`,
        [classId, assignmentId, next.title, next.description, next.dueAt, next.courseId],
      );
      return rowToAssignment({ ...row, ...next, due_at: next.dueAt, course_id: next.courseId });
    },

    async removeClassAssignment(classId: string, assignmentId: string): Promise<boolean> {
      const res = await pool.query(
        'DELETE FROM class_assignments WHERE class_id = $1 AND id = $2',
        [classId, assignmentId],
      );
      return (res.rowCount ?? 0) > 0;
    },

    async getGradebook(classId: string): Promise<GradebookSnapshot> {
      const res = await pool.query<{
        enrollment_id: string;
        assignment_id: string;
        status: string;
        score: number | null;
        updated_at: Date;
      }>(
        `SELECT enrollment_id, assignment_id, status, score, updated_at
         FROM gradebook_cells
         WHERE class_id = $1`,
        [classId],
      );
      return { classId, cells: res.rows.map(rowToGradebookCell) };
    },

    async upsertGradebookCell(
      classId: string,
      payload: {
        enrollmentId: string;
        assignmentId: string;
        status?: GradebookCellStatus;
        score?: number;
      },
    ): Promise<GradebookCell> {
      const existing = await pool.query<{
        status: string;
        score: number | null;
      }>(
        `SELECT status, score FROM gradebook_cells
         WHERE class_id = $1 AND enrollment_id = $2 AND assignment_id = $3`,
        [classId, payload.enrollmentId, payload.assignmentId],
      );
      const prev = existing.rows[0];
      const status =
        payload.status ?? (prev?.status as GradebookCellStatus | undefined) ??
        (payload.score != null ? 'graded' : 'pending');
      const score =
        payload.score !== undefined
          ? Math.max(0, Math.min(100, Math.round(payload.score)))
          : (prev?.score ?? undefined);
      const updatedAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO gradebook_cells
           (class_id, enrollment_id, assignment_id, status, score, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
         ON CONFLICT (class_id, enrollment_id, assignment_id)
         DO UPDATE SET status = EXCLUDED.status, score = EXCLUDED.score, updated_at = EXCLUDED.updated_at`,
        [classId, payload.enrollmentId, payload.assignmentId, status, score ?? null, updatedAt],
      );
      return {
        enrollmentId: payload.enrollmentId,
        assignmentId: payload.assignmentId,
        status,
        score,
        updatedAt,
      };
    },

    async removeGradebookCellsForEnrollment(classId: string, enrollmentId: string): Promise<void> {
      await pool.query(
        'DELETE FROM gradebook_cells WHERE class_id = $1 AND enrollment_id = $2',
        [classId, enrollmentId],
      );
    },

    async removeGradebookCellsForAssignment(classId: string, assignmentId: string): Promise<void> {
      await pool.query(
        'DELETE FROM gradebook_cells WHERE class_id = $1 AND assignment_id = $2',
        [classId, assignmentId],
      );
    },

    async listClassAnnouncements(classId: string): Promise<ClassAnnouncement[]> {
      const res = await pool.query<{
        id: string;
        class_id: string;
        author_account_id: string;
        title: string;
        body: string;
        created_at: Date;
      }>(
        `SELECT id, class_id, author_account_id, title, body, created_at
         FROM class_announcements
         WHERE class_id = $1
         ORDER BY created_at DESC`,
        [classId],
      );
      return res.rows.map(rowToAnnouncement);
    },

    async createClassAnnouncement(
      classId: string,
      payload: { title: string; body: string; authorAccountId: string },
    ): Promise<ClassAnnouncement> {
      const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      await pool.query(
        `INSERT INTO class_announcements
           (id, class_id, author_account_id, title, body, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
        [
          id,
          classId,
          payload.authorAccountId,
          payload.title.trim() || 'Announcement',
          payload.body.trim(),
          createdAt,
        ],
      );
      return {
        id,
        classId,
        title: payload.title.trim() || 'Announcement',
        body: payload.body.trim(),
        authorAccountId: payload.authorAccountId,
        createdAt,
      };
    },

    async removeClassAnnouncement(classId: string, announcementId: string): Promise<boolean> {
      const res = await pool.query(
        'DELETE FROM class_announcements WHERE class_id = $1 AND id = $2',
        [classId, announcementId],
      );
      return (res.rowCount ?? 0) > 0;
    },

    async listStudentEnrollments(studentEmail: string) {
      const email = studentEmail.trim().toLowerCase();
      const res = await pool.query<{
        enr_id: string;
        class_id: string;
        student_email: string;
        display_name: string | null;
        mastery: number | null;
        last_active: Date | null;
        enrolled_at: Date;
        tc_id: string;
        teacher_account_id: string;
        org_id: string | null;
        name: string;
        course_id: string | null;
        created_at: Date;
      }>(
        `SELECT e.id AS enr_id, e.class_id, e.student_email, e.display_name, e.mastery,
                e.last_active, e.enrolled_at,
                c.id AS tc_id, c.teacher_account_id, c.org_id, c.name, c.course_id, c.created_at
         FROM class_enrollments e
         JOIN teacher_classes c ON c.id = e.class_id
         WHERE LOWER(e.student_email) = $1
         ORDER BY e.enrolled_at DESC`,
        [email],
      );
      return res.rows.map((row) => ({
        enrollment: {
          id: row.enr_id,
          classId: row.class_id,
          studentEmail: row.student_email,
          displayName: row.display_name ?? undefined,
          mastery: row.mastery ?? undefined,
          lastActive: row.last_active?.toISOString(),
          enrolledAt: row.enrolled_at.toISOString(),
        },
        class: rowToClass({
          id: row.tc_id,
          teacher_account_id: row.teacher_account_id,
          org_id: row.org_id,
          name: row.name,
          course_id: row.course_id,
          created_at: row.created_at,
        }),
      }));
    },
  };
}

/** Returns null when DATABASE_URL is unset — caller uses in-memory store. */
export function createTeacherRepo(databaseUrl: string | undefined): TeacherRepository | null {
  if (!databaseUrl?.trim()) return null;
  return createPostgresTeacherRepo(databaseUrl.trim());
}
