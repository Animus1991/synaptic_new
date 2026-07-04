import type { DashboardStats } from '../../types';
import type { WorkspaceToolId } from '../taskFlows';
import type { SyllabusCoverageSnapshot, TopicCoverageRow } from './syllabusCoverageTracker';

export type CoveragePracticeTarget = {
  courseId: string;
  topicId: string;
  topicTitle: string;
  tool: WorkspaceToolId;
  simulatorTab?: 'exam-prep';
};

export function pickNextIncompleteTopic(snapshot: SyllabusCoverageSnapshot): TopicCoverageRow | null {
  const incomplete = snapshot.topics.filter((t) => !t.isComplete);
  if (incomplete.length === 0) return null;
  return [...incomplete].sort((a, b) => {
    const ratioA = a.totalLessons > 0 ? a.completedLessons / a.totalLessons : 0;
    const ratioB = b.totalLessons > 0 ? b.completedLessons / b.totalLessons : 0;
    return ratioA - ratioB || a.mastery - b.mastery;
  })[0] ?? null;
}

export function recommendToolForTopic(
  topic: TopicCoverageRow,
  stats: DashboardStats,
  daysToExam: number | null,
): WorkspaceToolId {
  if (daysToExam !== null && daysToExam <= 14) return 'simulator';
  if (stats.reviewsDue > 0 && topic.mastery < 70) return 'leitner';
  return 'quiz';
}

export function buildCoveragePracticeTarget(
  snapshot: SyllabusCoverageSnapshot,
  stats: DashboardStats,
  daysToExam: number | null,
): CoveragePracticeTarget | null {
  const topic = pickNextIncompleteTopic(snapshot);
  if (!topic) return null;
  const tool = recommendToolForTopic(topic, stats, daysToExam);
  return {
    courseId: snapshot.courseId,
    topicId: topic.topicId,
    topicTitle: topic.title,
    tool,
    simulatorTab: tool === 'simulator' ? 'exam-prep' : undefined,
  };
}
