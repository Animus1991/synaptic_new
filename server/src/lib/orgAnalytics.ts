import {
  listClassRosterAsync,
  listOrgClassesAsync,
  rosterCountAsync,
} from '../store/classStore';
import { listClassAssignmentsAsync } from '../store/assignmentStore';
import { getGradebookAsync } from '../store/gradebookStore';

export type OrgClassAnalytics = {
  classId: string;
  name: string;
  courseId?: string;
  studentCount: number;
  assignmentCount: number;
  avgMastery: number | null;
  avgScore: number | null;
  gradedCells: number;
  totalCells: number;
  completionRate: number | null;
};

export type OrgAnalyticsSnapshot = {
  orgId: string;
  classCount: number;
  totalStudents: number;
  totalAssignments: number;
  avgMastery: number | null;
  avgScore: number | null;
  completionRate: number | null;
  classes: OrgClassAnalytics[];
  generatedAt: string;
};

export async function computeOrgAnalyticsAsync(orgId: string): Promise<OrgAnalyticsSnapshot> {
  const classes = await listOrgClassesAsync(orgId);
  const classRows: OrgClassAnalytics[] = [];
  let totalStudents = 0;
  let totalAssignments = 0;
  let masterySum = 0;
  let masteryCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let gradedCells = 0;
  let totalCells = 0;

  for (const cls of classes) {
    const [roster, assignments, gradebook] = await Promise.all([
      listClassRosterAsync(cls.id),
      listClassAssignmentsAsync(cls.id),
      getGradebookAsync(cls.id),
    ]);
    const studentCount = roster.length;
    totalStudents += studentCount;
    totalAssignments += assignments.length;

    const classMastery = roster
      .map((r) => r.mastery)
      .filter((m): m is number => typeof m === 'number' && Number.isFinite(m));
    const avgMastery =
      classMastery.length > 0
        ? classMastery.reduce((s, v) => s + v, 0) / classMastery.length
        : null;
    if (avgMastery != null) {
      masterySum += avgMastery * classMastery.length;
      masteryCount += classMastery.length;
    }

    const scores = gradebook.cells
      .map((c) => c.score)
      .filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
    const classAvgScore =
      scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
    if (classAvgScore != null) {
      scoreSum += classAvgScore * scores.length;
      scoreCount += scores.length;
    }

    const classGraded = gradebook.cells.filter((c) => c.status === 'graded').length;
    const classTotal = studentCount * assignments.length;
    gradedCells += classGraded;
    totalCells += classTotal;

    classRows.push({
      classId: cls.id,
      name: cls.name,
      courseId: cls.courseId,
      studentCount,
      assignmentCount: assignments.length,
      avgMastery,
      avgScore: classAvgScore,
      gradedCells: classGraded,
      totalCells: classTotal,
      completionRate: classTotal > 0 ? classGraded / classTotal : null,
    });
  }

  return {
    orgId,
    classCount: classes.length,
    totalStudents,
    totalAssignments,
    avgMastery: masteryCount > 0 ? masterySum / masteryCount : null,
    avgScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    completionRate: totalCells > 0 ? gradedCells / totalCells : null,
    classes: classRows,
    generatedAt: new Date().toISOString(),
  };
}

/** Lightweight cohort summary for health/dashboard probes. */
export async function orgStudentCountAsync(orgId: string): Promise<number> {
  const classes = await listOrgClassesAsync(orgId);
  let total = 0;
  for (const cls of classes) {
    total += await rosterCountAsync(cls.id);
  }
  return total;
}
