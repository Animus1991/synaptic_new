import {
  buildNotebookLmCohortHeatmap,
  resolveNotebookLmBridgeCellsAsync,
  type CohortNotebookLmHeatmap,
} from './notebooklmBridgeAnalytics';
import { buildTopicMasteryHeatmap, type CohortTopicMasteryHeatmap } from './topicMasteryHeatmap';
import {
  listClassRosterAsync,
  listOrgClassesAsync,
  rosterCountAsync,
} from '../store/classStore';
import { listClassAssignmentsAsync } from '../store/assignmentStore';
import { getGradebookAsync } from '../store/gradebookStore';

const HEATMAP_DAYS = 14;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(isoDate(d));
  }
  return out;
}

function buildClassHeatmap(
  classId: string,
  className: string,
  gradebook: Awaited<ReturnType<typeof getGradebookAsync>>,
): CohortClassHeatmap {
  const dates = lastNDates(HEATMAP_DAYS);
  const byDate = new Map<string, { scores: number[]; students: Set<string> }>();
  for (const date of dates) byDate.set(date, { scores: [], students: new Set() });

  for (const cell of gradebook.cells) {
    if (cell.status !== 'graded' || cell.score == null) continue;
    const day = cell.updatedAt.slice(0, 10);
    const bucket = byDate.get(day);
    if (!bucket) continue;
    bucket.scores.push(cell.score);
    bucket.students.add(cell.enrollmentId);
  }

  return {
    classId,
    className,
    days: dates.map((date) => {
      const bucket = byDate.get(date)!;
      const avgScore =
        bucket.scores.length > 0
          ? bucket.scores.reduce((s, v) => s + v, 0) / bucket.scores.length
          : null;
      return {
        date,
        gradedCount: bucket.scores.length,
        activeStudents: bucket.students.size,
        avgScore,
      };
    }),
  };
}

export type CohortHeatmapDay = {
  date: string;
  gradedCount: number;
  activeStudents: number;
  avgScore: number | null;
};

export type CohortClassHeatmap = {
  classId: string;
  className: string;
  days: CohortHeatmapDay[];
};

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
  cohortHeatmap: CohortClassHeatmap[];
  topicMasteryHeatmap: CohortTopicMasteryHeatmap[];
  notebooklmBridgeHeatmap: CohortNotebookLmHeatmap[];
  generatedAt: string;
};

export async function computeOrgAnalyticsAsync(orgId: string): Promise<OrgAnalyticsSnapshot> {
  const classes = await listOrgClassesAsync(orgId);
  const classRows: OrgClassAnalytics[] = [];
  const cohortHeatmap: CohortClassHeatmap[] = [];
  const topicMasteryHeatmap: CohortTopicMasteryHeatmap[] = [];
  const notebooklmBridgeHeatmap: CohortNotebookLmHeatmap[] = [];
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

    cohortHeatmap.push(buildClassHeatmap(cls.id, cls.name, gradebook));
    topicMasteryHeatmap.push(buildTopicMasteryHeatmap(cls.id, cls.name, assignments, gradebook));
    const bridgeCells = await resolveNotebookLmBridgeCellsAsync(roster, cls.courseId);
    notebooklmBridgeHeatmap.push(buildNotebookLmCohortHeatmap(cls.id, cls.name, bridgeCells));
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
    cohortHeatmap,
    topicMasteryHeatmap,
    notebooklmBridgeHeatmap,
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
