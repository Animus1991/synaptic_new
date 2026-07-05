import { listStudentClassesAsync } from '../store/classStore';
import { listClassAssignmentsAsync } from '../store/assignmentStore';
import { getGradebookAsync } from '../store/gradebookStore';
import { listOrgsForAccountAsync } from '../store/orgStore';

export type StudentAssignmentRow = {
  classId: string;
  className: string;
  orgId?: string;
  assignmentId: string;
  title: string;
  dueAt?: string;
  status: 'graded' | 'submitted' | 'pending' | 'overdue';
  score?: number;
};

export type StudentClassRow = {
  classId: string;
  className: string;
  orgId?: string;
  courseId?: string;
  mastery: number | null;
  assignmentCount: number;
  gradedCount: number;
  completionRate: number | null;
  avgScore: number | null;
};

export type StudentDashboardSnapshot = {
  email: string;
  classCount: number;
  orgCount: number;
  avgScore: number | null;
  completionRate: number | null;
  overdueCount: number;
  upcomingCount: number;
  classes: StudentClassRow[];
  upcoming: StudentAssignmentRow[];
  generatedAt: string;
};

function assignmentStatus(
  dueAt: string | undefined,
  cell: { status: string; score?: number } | undefined,
  now = Date.now(),
): StudentAssignmentRow['status'] {
  if (cell?.status === 'graded' || cell?.score != null) return 'graded';
  if (cell?.status === 'submitted') return 'submitted';
  if (dueAt) {
    const due = Date.parse(dueAt);
    if (Number.isFinite(due) && due < now) return 'overdue';
  }
  return 'pending';
}

export async function computeStudentDashboardAsync(
  accountId: string,
  email: string,
): Promise<StudentDashboardSnapshot> {
  const [rows, orgs] = await Promise.all([
    listStudentClassesAsync(email),
    listOrgsForAccountAsync(accountId),
  ]);

  const classes: StudentClassRow[] = [];
  const upcoming: StudentAssignmentRow[] = [];
  let scoreSum = 0;
  let scoreCount = 0;
  let gradedTotal = 0;
  let assignmentTotal = 0;
  let overdueCount = 0;
  const now = Date.now();
  const weekAhead = now + 7 * 24 * 60 * 60_000;

  for (const { enrollment, class: cls } of rows) {
    const [assignments, gradebook] = await Promise.all([
      listClassAssignmentsAsync(cls.id),
      getGradebookAsync(cls.id),
    ]);
    const myCells = gradebook.cells.filter((c) => c.enrollmentId === enrollment.id);
    const graded = myCells.filter((c) => c.status === 'graded' || c.score != null);
    const scores = graded
      .map((c) => c.score)
      .filter((s): s is number => typeof s === 'number' && Number.isFinite(s));

    assignmentTotal += assignments.length;
    gradedTotal += graded.length;
    if (scores.length > 0) {
      scoreSum += scores.reduce((s, v) => s + v, 0);
      scoreCount += scores.length;
    }

    const classAvg =
      scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null;

    classes.push({
      classId: cls.id,
      className: cls.name,
      orgId: cls.orgId,
      courseId: cls.courseId,
      mastery: enrollment.mastery ?? null,
      assignmentCount: assignments.length,
      gradedCount: graded.length,
      completionRate:
        assignments.length > 0 ? graded.length / assignments.length : null,
      avgScore: classAvg,
    });

    for (const a of assignments) {
      const cell = myCells.find((c) => c.assignmentId === a.id);
      const status = assignmentStatus(a.dueAt, cell, now);
      if (status === 'overdue') overdueCount += 1;

      const dueMs = a.dueAt ? Date.parse(a.dueAt) : NaN;
      const includeUpcoming =
        status !== 'graded' &&
        (status === 'overdue' || (Number.isFinite(dueMs) && dueMs <= weekAhead) || !a.dueAt);

      if (includeUpcoming) {
        upcoming.push({
          classId: cls.id,
          className: cls.name,
          orgId: cls.orgId,
          assignmentId: a.id,
          title: a.title,
          dueAt: a.dueAt,
          status,
          score: cell?.score,
        });
      }
    }
  }

  upcoming.sort((a, b) => {
    const ad = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER;
    const bd = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });

  return {
    email,
    classCount: rows.length,
    orgCount: orgs.length,
    avgScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    completionRate: assignmentTotal > 0 ? gradedTotal / assignmentTotal : null,
    overdueCount,
    upcomingCount: upcoming.length,
    classes,
    upcoming: upcoming.slice(0, 20),
    generatedAt: new Date().toISOString(),
  };
}
