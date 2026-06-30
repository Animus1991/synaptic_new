import type { Task, UserSettings } from '../types';
import { upsertCalendarEvent } from './googleClient';

export type TaskCalendarWindow = {
  startIso: string;
  endIso: string;
  timeZone: string;
};

export type TaskCalendarSyncUpdate = {
  taskId: string;
  googleCalendarEventId: string;
  calendarSyncedAt: string;
};

export function taskCalendarWindow(task: Task): TaskCalendarWindow | null {
  const anchor = task.scheduledFor ?? task.dueAt;
  if (!anchor) return null;
  const start = new Date(anchor);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = Math.max(15, task.estimatedMinutes || 25);
  const end = new Date(start.getTime() + minutes * 60_000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    timeZone,
  };
}

export function tasksEligibleForCalendarSync(tasks: Task[]): Task[] {
  return tasks.filter(
    (t) =>
      t.status === 'pending'
      && Boolean(t.scheduledFor || t.dueAt),
  );
}

export async function syncTasksToGoogleCalendar(
  token: string,
  settings: UserSettings,
  tasks: Task[],
  opts?: { onlySpacedRepetition?: boolean },
): Promise<TaskCalendarSyncUpdate[]> {
  const eligible = tasksEligibleForCalendarSync(tasks).filter(
    (t) => !opts?.onlySpacedRepetition || t.isSpacedRepetition,
  );
  const synced: TaskCalendarSyncUpdate[] = [];
  const now = new Date().toISOString();

  for (const task of eligible) {
    const window = taskCalendarWindow(task);
    if (!window) continue;
    try {
      const result = await upsertCalendarEvent(token, settings, {
        title: `[Synapse] ${task.title}`,
        description: `${task.courseName} · ${task.type}`,
        startIso: window.startIso,
        endIso: window.endIso,
        timeZone: window.timeZone,
        eventId: task.googleCalendarEventId,
        sourceId: task.id,
      });
      if (result.eventId) {
        synced.push({
          taskId: task.id,
          googleCalendarEventId: result.eventId,
          calendarSyncedAt: now,
        });
      }
    } catch {
      // Continue syncing remaining tasks.
    }
  }

  return synced;
}
