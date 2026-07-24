import type { Course, DashboardStats, LearnerModel, Task } from '../types';
import { findPendingTask } from './taskFlows';

export type DashboardTaskBuckets = {
  pendingTasks: Task[];
  criticalTasks: Task[];
  fixTasks: Task[];
  firstReviewTask: Task | undefined;
  examTask: Task | undefined;
};

export type DashboardPageStats = {
  streak: number;
  todayXp: number;
  reviewsDue: number;
  conceptsMastered: number;
  totalConcepts: number;
  studyMinutesToday: number;
  pendingTaskCount: number;
  criticalTaskCount: number;
  unresolvedMisconceptionCount: number;
};

export type DashboardPageViewModel = {
  isEmpty: boolean;
  activeCourses: Course[];
  taskBuckets: DashboardTaskBuckets;
  stats: DashboardPageStats;
  masteryTrendLast7: number[];
  unresolvedMisconceptions: LearnerModel['misconceptions'];
};

export function selectDashboardTaskBuckets(tasks: Task[]): DashboardTaskBuckets {
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in-progress');
  return {
    pendingTasks,
    criticalTasks: pendingTasks.filter((t) => t.priority === 'critical' || t.priority === 'high'),
    fixTasks: pendingTasks.filter((t) => t.category === 'fix'),
    firstReviewTask: findPendingTask(tasks, (t) => t.isSpacedRepetition && t.status === 'pending'),
    examTask: findPendingTask(tasks, (t) => t.type === 'exam-prep'),
  };
}

export function selectActiveCourses(courses: Course[]): Course[] {
  return courses.filter((course) => course.status !== 'generating');
}

export function selectUnresolvedMisconceptions(learnerModel: LearnerModel) {
  return learnerModel.misconceptions.filter((misconception) => !misconception.corrected);
}

/** Canonical stat strip values — single source for Dashboard hero metrics. */
export function selectDashboardPageStats(
  stats: DashboardStats,
  tasks: Task[],
  learnerModel: LearnerModel,
): DashboardPageStats {
  const buckets = selectDashboardTaskBuckets(tasks);
  return {
    streak: stats.streak,
    todayXp: stats.todayXP,
    reviewsDue: stats.reviewsDue,
    conceptsMastered: stats.conceptsMastered,
    totalConcepts: stats.totalConcepts,
    studyMinutesToday: stats.studyTimeToday,
    pendingTaskCount: buckets.pendingTasks.length,
    criticalTaskCount: buckets.criticalTasks.length,
    unresolvedMisconceptionCount: selectUnresolvedMisconceptions(learnerModel).length,
  };
}

export function selectDashboardPageViewModel(opts: {
  stats: DashboardStats;
  courses: Course[];
  tasks: Task[];
  learnerModel: LearnerModel;
}): DashboardPageViewModel {
  const { stats, courses, tasks, learnerModel } = opts;
  return {
    isEmpty: courses.length === 0,
    activeCourses: selectActiveCourses(courses),
    taskBuckets: selectDashboardTaskBuckets(tasks),
    stats: selectDashboardPageStats(stats, tasks, learnerModel),
    masteryTrendLast7: stats.masteryTrend.slice(-7),
    unresolvedMisconceptions: selectUnresolvedMisconceptions(learnerModel),
  };
}
