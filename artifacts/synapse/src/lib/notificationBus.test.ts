import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  listNotifications,
  notifyError,
  notifySuccess,
  pushNotification,
  resetNotificationBusForTests,
  subscribeNotifications,
} from './notificationBus';

beforeEach(() => {
  resetNotificationBusForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('notificationBus', () => {
  it('notifies subscribers on push', () => {
    let count = 0;
    subscribeNotifications((items) => {
      count = items.length;
    });
    notifySuccess('Saved');
    expect(count).toBe(1);
  });

  it('auto-dismisses after ttl', () => {
    pushNotification({ title: 'Temp', ttlMs: 1000 });
    expect(listNotifications()).toHaveLength(1);
    vi.advanceTimersByTime(1001);
    expect(listNotifications()).toHaveLength(0);
  });

  it('marks errors assertive', () => {
    notifyError('Sync failed');
    expect(listNotifications()[0]!.assertive).toBe(true);
  });
});
