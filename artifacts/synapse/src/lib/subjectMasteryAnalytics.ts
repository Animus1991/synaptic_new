import type { ActivityItem, Course, Topic } from '../types';
import { filterActivitiesByRange, type AnalyticsDateRange } from './analyticsDateRange';

export type SubjectMasteryTile = {
  courseId: string;
  title: string;
  mastery: number;
  pendingConcepts: number;
  trend: 'up' | 'down' | 'flat';
  trendDelta: number;
  color: string;
  icon: string;
  topics: Topic[];
};

function pendingTopics(course: Course): number {
  return course.topics.filter((t) => t.mastery < 70).length;
}

/** Rough course activity weight from description/title mentions in the window. */
function activityWeightForCourse(course: Course, activities: ActivityItem[]): number {
  const needle = course.title.toLowerCase().slice(0, 24);
  if (!needle) return 0;
  return activities.filter((a) => a.description.toLowerCase().includes(needle)).length;
}

export function buildSubjectMasteryTiles(
  courses: Course[],
  activities: ActivityItem[],
  range: AnalyticsDateRange,
): SubjectMasteryTile[] {
  const inRange = filterActivitiesByRange(activities, range);
  const mid = Math.floor(inRange.length / 2);
  const recent = inRange.slice(0, mid);
  const older = inRange.slice(mid);

  return courses
    .filter((c) => c.status !== 'generating')
    .map((course) => {
      const recentW = activityWeightForCourse(course, recent);
      const olderW = activityWeightForCourse(course, older);
      const trendDelta = recentW - olderW;
      const trend: SubjectMasteryTile['trend'] =
        trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'flat';
      return {
        courseId: course.id,
        title: course.title,
        mastery: Math.round(course.mastery),
        pendingConcepts: pendingTopics(course),
        trend,
        trendDelta,
        color: course.color,
        icon: course.icon,
        topics: course.topics,
      };
    })
    .sort((a, b) => a.mastery - b.mastery);
}
