import type { ActivityItem, ActivityType, AppView } from '../types';

export type ActivityDeepLink = {
  view: AppView;
  taskFilter?: 'review' | 'exam';
};

export function countUnreadNotifications(
  activities: ActivityItem[],
  lastSeenAt?: string,
): number {
  if (!lastSeenAt) return 0;
  const seenMs = new Date(lastSeenAt).getTime();
  return activities.filter((a) => new Date(a.timestamp).getTime() > seenMs).length;
}

export function isActivityUnread(activity: ActivityItem, lastSeenAt?: string): boolean {
  if (!lastSeenAt) return false;
  return new Date(activity.timestamp).getTime() > new Date(lastSeenAt).getTime();
}

export function activityDeepLink(type: ActivityType): ActivityDeepLink | null {
  switch (type) {
    case 'task_complete':
    case 'review_done':
    case 'mistake_fixed':
      return { view: 'tasks' };
    case 'upload':
      return { view: 'library' };
    case 'study_time':
      return { view: 'dashboard' };
    case 'quiz_passed':
    case 'quiz_failed':
      return { view: 'tasks' };
    default:
      return { view: 'analytics' };
  }
}

export function notificationsReadWatermark(): string {
  return new Date().toISOString();
}
