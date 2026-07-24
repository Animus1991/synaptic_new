import type { ClassAssignment } from '../store/assignmentStore';
import type { GradebookSnapshot } from '../store/gradebookStore';

export type TopicMasteryCell = {
  topicId: string;
  topicLabel: string;
  avgScore: number | null;
  gradedCount: number;
  masteryLevel: number;
};

export type CohortTopicMasteryHeatmap = {
  classId: string;
  className: string;
  topics: TopicMasteryCell[];
};

export function buildTopicMasteryHeatmap(
  classId: string,
  className: string,
  assignments: ClassAssignment[],
  gradebook: GradebookSnapshot,
): CohortTopicMasteryHeatmap {
  const topics: TopicMasteryCell[] = assignments.map((assignment) => {
    const scores = gradebook.cells
      .filter(
        (c) => c.assignmentId === assignment.id && c.status === 'graded' && c.score != null,
      )
      .map((c) => c.score!);
    const avgScore =
      scores.length > 0 ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
    return {
      topicId: assignment.id,
      topicLabel: assignment.title,
      avgScore,
      gradedCount: scores.length,
      masteryLevel: avgScore != null ? avgScore / 100 : 0,
    };
  });

  return { classId, className, topics };
}
