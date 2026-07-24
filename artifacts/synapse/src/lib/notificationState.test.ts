import { describe, expect, it } from 'vitest';
import { countUnreadNotifications, isActivityUnread, activityDeepLink } from './notificationState';
import type { ActivityItem } from '../types';

const sample: ActivityItem[] = [
  { id: '1', type: 'upload', description: 'Uploaded', timestamp: '2026-07-10T10:00:00.000Z' },
  { id: '2', type: 'task_complete', description: 'Done', timestamp: '2026-07-12T10:00:00.000Z' },
];

describe('notificationState', () => {
  it('counts unread activities after watermark', () => {
    expect(countUnreadNotifications(sample, '2026-07-11T00:00:00.000Z')).toBe(1);
    expect(countUnreadNotifications(sample, undefined)).toBe(0);
  });

  it('resolves deep links by activity type', () => {
    expect(activityDeepLink('upload')?.view).toBe('library');
    expect(activityDeepLink('task_complete')?.view).toBe('tasks');
  });

  it('marks individual unread state', () => {
    expect(isActivityUnread(sample[1], '2026-07-11T00:00:00.000Z')).toBe(true);
    expect(isActivityUnread(sample[0], '2026-07-11T00:00:00.000Z')).toBe(false);
  });
});
