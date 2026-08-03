import type { Task, UserSettings } from '../types';
import { upsertCalendarEvent } from './googleClient';
import {
  buildCalendarCheckInHint,
  calendarDurationFromCheckIn,
  rankTasksForCalendarHint,
  softCalendarStartIso,
  type CalendarCheckInHint,
} from './calendarCheckInHint';
import { loadDailyCheckIn } from './dailyLearningCheckIn';

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

export type CalendarSyncOpts = {
  onlySpacedRepetition?: boolean;
  /**
   * Soft check-in hints — duration / ranking / soft start for unscheduled
   * focus tasks. Does not change Google auth or event API shape.
   */
  checkInHint?: CalendarCheckInHint | null;
  /** Sync top chat-ranked tasks even without scheduledFor/dueAt (soft start). */
  includeChatPlanSoftSlots?: boolean;
  /** Cap soft-slot events created from chat plan. */
  maxSoftSlots?: number;
};

export function taskCalendarWindow(
  task: Task,
  opts?: { durationMinutes?: number; softStartIso?: string },
): TaskCalendarWindow | null {
  const anchor = task.scheduledFor ?? task.dueAt ?? opts?.softStartIso;
  if (!anchor) return null;
  const start = new Date(anchor);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = Math.max(
    15,
    opts?.durationMinutes ?? (task.estimatedMinutes || 25),
  );
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

function resolveHint(opts?: CalendarSyncOpts): CalendarCheckInHint | null {
  if (opts?.checkInHint === null) return null;
  if (opts?.checkInHint) return opts.checkInHint;
  // Default: read today’s chat check-in (harmless if empty).
  return buildCalendarCheckInHint('en', loadDailyCheckIn().answers);
}

export async function syncTasksToGoogleCalendar(
  token: string,
  settings: UserSettings,
  tasks: Task[],
  opts?: CalendarSyncOpts,
): Promise<TaskCalendarSyncUpdate[]> {
  const hint = resolveHint(opts);
  const durationOverride = hint?.durationMinutes ?? null;

  let eligible = tasksEligibleForCalendarSync(tasks).filter(
    (t) => !opts?.onlySpacedRepetition || t.isSpacedRepetition,
  );

  // Prefer chat-ranked order among eligible scheduled tasks.
  if (hint?.hasSignals) {
    const rankedIds = new Map(
      rankTasksForCalendarHint(eligible, {
        availableMinutes: durationOverride ?? undefined,
        sessionIntent: hint.sessionIntent,
        focusCourseId: hint.focusCourseId,
        focusCourseTitle: hint.focusCourseTitle,
      }).map((t, i) => [t.id, i]),
    );
    eligible = [...eligible].sort(
      (a, b) => (rankedIds.get(a.id) ?? 99) - (rankedIds.get(b.id) ?? 99),
    );
  }

  // Soft slots: unscheduled pending tasks matching today’s chat plan.
  const soft: Task[] = [];
  if (opts?.includeChatPlanSoftSlots && hint?.hasSignals) {
    const maxSoft = opts.maxSoftSlots ?? 2;
    const scheduledIds = new Set(eligible.map((t) => t.id));
    for (const t of rankTasksForCalendarHint(tasks, {
      sessionIntent: hint.sessionIntent,
      focusCourseId: hint.focusCourseId,
      focusCourseTitle: hint.focusCourseTitle,
      availableMinutes: durationOverride ?? undefined,
    })) {
      if (scheduledIds.has(t.id)) continue;
      if (t.status !== 'pending') continue;
      if (opts.onlySpacedRepetition && !t.isSpacedRepetition) continue;
      soft.push(t);
      if (soft.length >= maxSoft) break;
    }
  }

  const synced: TaskCalendarSyncUpdate[] = [];
  const now = new Date().toISOString();
  const softStart = softCalendarStartIso();

  const queue: Array<{ task: Task; soft?: boolean }> = [
    ...eligible.map((task) => ({ task })),
    ...soft.map((task) => ({ task, soft: true })),
  ];

  for (const { task, soft: isSoft } of queue) {
    const durationMinutes = durationOverride != null
      ? calendarDurationFromCheckIn(
          {
            availableMinutes: durationOverride,
            sessionIntent: hint?.sessionIntent,
            energy: loadDailyCheckIn().answers.energy,
          },
          task.estimatedMinutes,
        )
      : undefined;
    const window = taskCalendarWindow(task, {
      durationMinutes,
      softStartIso: isSoft ? softStart : undefined,
    });
    if (!window) continue;
    try {
      const planNote = hint?.hasSignals
        ? `Chat plan: ${hint.summary}`
        : '';
      const result = await upsertCalendarEvent(token, settings, {
        title: `[Synapse] ${task.title}`,
        description: [`${task.courseName} · ${task.type}`, planNote, isSoft ? '(soft slot from chat plan)' : '']
          .filter(Boolean)
          .join('\n'),
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
      // Continue syncing remaining tasks — never abort the whole Google flow.
    }
  }

  return synced;
}
