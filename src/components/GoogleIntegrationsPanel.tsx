import { useCallback, useEffect, useState } from 'react';
import { Presentation, List, Link2, XCircle, Plus, ArrowRight, Calendar } from '@/lib/lucide-shim';
import type { Task, UserSettings } from '../types';
import {
  clearGoogleAuthQueryParams,
  completeGoogleAuth,
  createGoogleMeetSpace,
  createGoogleTask,
  deleteCalendarEvent,
  disconnectGoogle,
  fetchGoogleStatus,
  googleAuthStartUrl,
  googleConnectStartUrl,
  listCalendarEvents,
  listGoogleTaskLists,
  listGoogleTasks,
  type CalendarEventLite,
  type GoogleConnectionStatus,
  type GoogleTask,
} from '../lib/googleClient';
import { syncTasksToGoogleCalendar, type TaskCalendarSyncUpdate } from '../lib/taskCalendarSync';
import { useI18n } from '../lib/i18n';
import { formatDateTime, localeTag } from '../lib/localeFormat';

type Props = {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
  onAuthComplete?: (message: string) => void;
  synapseTasks?: Task[];
  onCalendarSync?: (updates: TaskCalendarSyncUpdate[]) => void;
  lang?: 'en' | 'el';
};

export function GoogleIntegrationsPanel({
  settings,
  onUpdate,
  onAuthComplete,
  synapseTasks = [],
  onCalendarSync,
  lang = 'en',
}: Props) {
  const { t } = useI18n();
  const [status, setStatus] = useState<GoogleConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventLite[]>([]);
  const [taskDraft, setTaskDraft] = useState('');
  const [meetUri, setMeetUri] = useState<string | null>(null);
  const [listId, setListId] = useState('@default');

  const refreshStatus = useCallback(async () => {
    if (!settings.authToken) {
      setStatus(null);
      return;
    }
    try {
      const s = await fetchGoogleStatus(settings.authToken, settings);
      setStatus(s);
    } catch (e) {
      setStatus({ connected: false, scopes: [], hasTasks: false, hasMeet: false, hasCalendar: false });
      setError(e instanceof Error ? e.message : 'Status failed');
    }
  }, [settings]);

  const loadTasks = useCallback(async () => {
    if (!settings.authToken || !status?.hasTasks) return;
    setLoading(true);
    try {
      const lists = await listGoogleTaskLists(settings.authToken, settings);
      const activeList = lists[0]?.id ?? '@default';
      setListId(activeList);
      const items = await listGoogleTasks(settings.authToken, settings, activeList);
      setTasks(items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tasks load failed');
    } finally {
      setLoading(false);
    }
  }, [settings, status?.hasTasks]);

  const loadCalendarEvents = useCallback(async () => {
    if (!settings.authToken || !status?.hasCalendar) return;
    setLoading(true);
    try {
      const events = await listCalendarEvents(settings.authToken, settings);
      setCalendarEvents(events.filter((ev) => Boolean(ev.id)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calendar load failed');
    } finally {
      setLoading(false);
    }
  }, [settings, status?.hasCalendar]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status?.connected && status.hasTasks) void loadTasks();
  }, [status?.connected, status?.hasTasks, loadTasks]);

  useEffect(() => {
    if (status?.connected && status.hasCalendar) void loadCalendarEvents();
  }, [status?.connected, status?.hasCalendar, loadCalendarEvents]);

  const formatEventWhen = (ev: CalendarEventLite): string => {
    const raw = ev.start?.dateTime ?? ev.start?.date;
    if (!raw) return '—';
    return formatDateTime(raw, localeTag(lang));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get('google_auth_code');
    const googleState = params.get('google');
    const reason = params.get('reason');

    if (reason && params.get('google') === 'error') {
      setError(decodeURIComponent(reason));
      clearGoogleAuthQueryParams();
      return;
    }

    if (googleState === 'connected') {
      void refreshStatus().then(() => {
        onAuthComplete?.(t('googleConnectedToast'));
      });
      clearGoogleAuthQueryParams();
      return;
    }

    if (authCode) {
      void (async () => {
        try {
          const session = await completeGoogleAuth(authCode, settings);
          onUpdate({
            authToken: session.token,
            authEmail: session.email,
            authPlan: (session.plan as UserSettings['authPlan']) ?? 'free',
          });
          await refreshStatus();
          onAuthComplete?.(
            t('googleSignedInAs').replace('{email}', session.email),
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Google sign-in failed');
        } finally {
          clearGoogleAuthQueryParams();
        }
      })();
    }
  }, [onAuthComplete, onUpdate, refreshStatus, settings, t]);

  const startGoogleSignIn = () => {
    window.location.href = googleAuthStartUrl(
      settings,
      'signin',
      `${window.location.origin}/?view=settings`,
    );
  };

  const startGoogleConnect = () => {
    if (!settings.authToken) {
      setError(t('googleSignInSynapseFirst'));
      return;
    }
    window.location.href = googleConnectStartUrl(
      settings,
      settings.authToken,
      `${window.location.origin}/?view=settings&google=connected`,
    );
  };

  const handleDisconnect = async () => {
    if (!settings.authToken) return;
    setLoading(true);
    try {
      await disconnectGoogle(settings.authToken, settings);
      setStatus({ connected: false, scopes: [], hasTasks: false, hasMeet: false, hasCalendar: false });
      setTasks([]);
      setCalendarEvents([]);
      setMeetUri(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!settings.authToken || !taskDraft.trim()) return;
    setLoading(true);
    try {
      await createGoogleTask(settings.authToken, settings, taskDraft.trim(), undefined, listId);
      setTaskDraft('');
      await loadTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create task failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeet = async () => {
    if (!settings.authToken) return;
    setLoading(true);
    try {
      const space = await createGoogleMeetSpace(settings.authToken, settings);
      setMeetUri(space.meetingUri ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Meet create failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarSync = async (onlySpacedRepetition: boolean) => {
    if (!settings.authToken) return;
    setLoading(true);
    try {
      const updates = await syncTasksToGoogleCalendar(
        settings.authToken,
        settings,
        synapseTasks,
        { onlySpacedRepetition },
      );
      onCalendarSync?.(updates);
      onAuthComplete?.(t('googleCalendarSynced').replace('{count}', String(updates.length)));
      await loadCalendarEvents();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('googleCalendarSyncFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCalendarEvent = async (eventId: string) => {
    if (!settings.authToken) return;
    setLoading(true);
    try {
      await deleteCalendarEvent(settings.authToken, settings, eventId);
      await loadCalendarEvents();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete event failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="google-integrations-panel">
      <p className="text-xs text-text-secondary leading-relaxed">
        {t('googleIntro')}
      </p>

      <div className="flex flex-wrap gap-2">
        {!settings.authToken && (
          <button
            type="button"
            data-testid="google-sign-in"
            onClick={startGoogleSignIn}
            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs font-semibold text-text-primary hover:border-brand-500/30"
          >
            <Link2 className="h-3.5 w-3.5" />
            {t('googleSignInWithGoogle')}
          </button>
        )}
        {settings.authToken && !status?.connected && (
          <button
            type="button"
            data-testid="google-connect"
            onClick={startGoogleConnect}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-600/10 px-3 py-2 text-xs font-semibold text-brand-800"
          >
            <Link2 className="h-3.5 w-3.5" />
            {t('googleConnectTasksMeet')}
          </button>
        )}
        {status?.connected && (
          <>
            <span className="ws-chip-ok inline-flex items-center rounded-full px-2 py-1 text-[10px]">
              {status.email ?? t('googleConnected')}
            </span>
            <button
              type="button"
              data-testid="google-disconnect"
              onClick={() => void handleDisconnect()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary"
            >
              <XCircle className="h-3 w-3" />
              {t('googleDisconnect')}
            </button>
          </>
        )}
      </div>

      {status?.connected && status.hasCalendar && (
        <div className="rounded-xl border border-border-subtle bg-surface-primary/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Calendar className="h-4 w-4 text-brand-700" />
            {t('googleCalendar')}
          </div>
          <p className="text-[11px] text-text-muted">{t('googleCalendarIntro')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="google-calendar-sync-reviews"
              disabled={loading}
              onClick={() => void handleCalendarSync(true)}
              className="ws-empty-cta-primary text-xs"
            >
              {t('googleSyncDueReviews')}
            </button>
            <button
              type="button"
              data-testid="google-calendar-sync-all"
              disabled={loading}
              onClick={() => void handleCalendarSync(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1.5 text-xs text-text-secondary hover:border-brand-500/30"
            >
              {t('googleSyncAllScheduled')}
            </button>
            <button
              type="button"
              data-testid="google-calendar-refresh"
              disabled={loading}
              onClick={() => void loadCalendarEvents()}
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1.5 text-xs text-text-secondary hover:border-brand-500/30"
            >
              {t('googleRefreshCalendar')}
            </button>
          </div>
          <div className="space-y-1 pt-2 border-t border-border-subtle/60">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
              {t('googleUpcomingEvents')}
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-text-secondary" data-testid="google-calendar-events">
              {calendarEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between gap-2 rounded bg-surface-card/60 px-2 py-1"
                  data-testid={`google-calendar-event-${ev.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-primary">{ev.summary ?? ev.id}</p>
                    <p className="text-[10px] text-text-muted">{formatEventWhen(ev)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleDeleteCalendarEvent(ev.id)}
                    data-testid={`google-calendar-delete-${ev.id}`}
                    className="shrink-0 text-[10px] text-accent-rose hover:underline"
                  >
                    {t('googleDeleteEvent')}
                  </button>
                </li>
              ))}
              {calendarEvents.length === 0 && !loading && (
                <li className="text-text-muted">{t('googleNoEvents')}</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {status?.connected && status.hasMeet && (
        <div className="rounded-xl border border-border-subtle bg-surface-primary/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Presentation className="h-4 w-4 text-brand-700" />
            {t('googleGroupVideoMeet')}
          </div>
          <button
            type="button"
            data-testid="google-meet-create"
            disabled={loading}
            onClick={() => void handleCreateMeet()}
            className="ws-empty-cta-primary text-xs"
          >
            {t('googleCreateMeetLink')}
          </button>
          {meetUri && (
            <a
              href={meetUri}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="google-meet-link"
              className="inline-flex items-center gap-1 text-xs text-brand-800 hover:underline break-all"
            >
              {meetUri}
              <ArrowRight className="h-3 w-3 shrink-0" />
            </a>
          )}
        </div>
      )}

      {status?.connected && status.hasTasks && (
        <div className="rounded-xl border border-border-subtle bg-surface-primary/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <List className="h-4 w-4 text-brand-700" />
            {t('googleTasks')}
          </div>
          <div className="flex gap-2">
            <input
              value={taskDraft}
              onChange={(e) => setTaskDraft(e.target.value)}
              placeholder={t('googleNewStudyTaskPlaceholder')}
              className="flex-1 rounded-lg border border-border-subtle bg-surface-input px-2 py-1.5 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && void handleCreateTask()}
            />
            <button
              type="button"
              data-testid="google-task-create"
              disabled={loading || !taskDraft.trim()}
              onClick={() => void handleCreateTask()}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 px-2 py-1.5 text-xs font-semibold text-brand-800"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('googleAdd')}
            </button>
          </div>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-text-secondary">
            {tasks.map((task) => (
              <li key={task.id ?? task.title} className="truncate rounded bg-surface-card/60 px-2 py-1">
                {task.title}
              </li>
            ))}
            {tasks.length === 0 && !loading && (
              <li className="text-text-muted">{t('googleNoTasksYet')}</li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-xs text-accent-rose" data-testid="google-integration-error">
          {error}
        </p>
      )}
    </div>
  );
}
