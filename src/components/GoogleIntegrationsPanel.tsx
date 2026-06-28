import { useCallback, useEffect, useState } from 'react';
import { Presentation, List, Link2, XCircle, Plus, ArrowRight } from '@/lib/lucide-shim';
import type { UserSettings } from '../types';
import {
  clearGoogleAuthQueryParams,
  completeGoogleAuth,
  createGoogleMeetSpace,
  createGoogleTask,
  disconnectGoogle,
  fetchGoogleStatus,
  googleAuthStartUrl,
  googleConnectStartUrl,
  listGoogleTaskLists,
  listGoogleTasks,
  type GoogleConnectionStatus,
  type GoogleTask,
} from '../lib/googleClient';

type Props = {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
  onAuthComplete?: (message: string) => void;
  lang?: 'en' | 'el';
};

export function GoogleIntegrationsPanel({
  settings,
  onUpdate,
  onAuthComplete,
  lang = settings.language,
}: Props) {
  const isEl = lang === 'el';
  const [status, setStatus] = useState<GoogleConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
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
      setStatus({ connected: false, scopes: [], hasTasks: false, hasMeet: false });
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

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status?.connected && status.hasTasks) void loadTasks();
  }, [status?.connected, status?.hasTasks, loadTasks]);

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
        onAuthComplete?.(isEl ? 'Google συνδέθηκε (Tasks + Meet)' : 'Google connected (Tasks + Meet)');
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
            isEl ? `Σύνδεση Google ως ${session.email}` : `Signed in with Google as ${session.email}`,
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Google sign-in failed');
        } finally {
          clearGoogleAuthQueryParams();
        }
      })();
    }
  }, [isEl, onAuthComplete, onUpdate, refreshStatus, settings]);

  const startGoogleSignIn = () => {
    window.location.href = googleAuthStartUrl(
      settings,
      'signin',
      `${window.location.origin}/?view=settings`,
    );
  };

  const startGoogleConnect = () => {
    if (!settings.authToken) {
      setError(isEl ? 'Συνδέσου πρώτα στον λογαριασμό Synapse' : 'Sign in to Synapse first');
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
      setStatus({ connected: false, scopes: [], hasTasks: false, hasMeet: false });
      setTasks([]);
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

  return (
    <div className="space-y-4" data-testid="google-integrations-panel">
      <p className="text-xs text-text-secondary leading-relaxed">
        {isEl
          ? 'Σύνδεση Google για εργασίες μελέτης (Tasks) και βιντεοκλήσεις ομάδας (Meet). Απαιτεί ρύθμιση GOOGLE_CLIENT_ID στον server.'
          : 'Connect Google for study tasks and group video calls (Meet). Requires GOOGLE_CLIENT_ID on the server.'}
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
            {isEl ? 'Σύνδεση με Google' : 'Sign in with Google'}
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
            {isEl ? 'Σύνδεση Google (Tasks + Meet)' : 'Connect Google (Tasks + Meet)'}
          </button>
        )}
        {status?.connected && (
          <>
            <span className="ws-chip-ok inline-flex items-center rounded-full px-2 py-1 text-[10px]">
              {status.email ?? (isEl ? 'Συνδεδεμένο' : 'Connected')}
            </span>
            <button
              type="button"
              data-testid="google-disconnect"
              onClick={() => void handleDisconnect()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary"
            >
              <XCircle className="h-3 w-3" />
              {isEl ? 'Αποσύνδεση' : 'Disconnect'}
            </button>
          </>
        )}
      </div>

      {status?.connected && status.hasMeet && (
        <div className="rounded-xl border border-border-subtle bg-surface-primary/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Presentation className="h-4 w-4 text-brand-700" />
            {isEl ? 'Ομαδική βιντεοκλήση (Meet)' : 'Group video (Meet)'}
          </div>
          <button
            type="button"
            data-testid="google-meet-create"
            disabled={loading}
            onClick={() => void handleCreateMeet()}
            className="ws-empty-cta-primary text-xs"
          >
            {isEl ? 'Δημιουργία Meet link' : 'Create Meet link'}
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
            {isEl ? 'Google Tasks' : 'Google Tasks'}
          </div>
          <div className="flex gap-2">
            <input
              value={taskDraft}
              onChange={(e) => setTaskDraft(e.target.value)}
              placeholder={isEl ? 'Νέα εργασία μελέτης…' : 'New study task…'}
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
              {isEl ? 'Προσθήκη' : 'Add'}
            </button>
          </div>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-text-secondary">
            {tasks.map((task) => (
              <li key={task.id ?? task.title} className="truncate rounded bg-surface-card/60 px-2 py-1">
                {task.title}
              </li>
            ))}
            {tasks.length === 0 && !loading && (
              <li className="text-text-muted italic">{isEl ? 'Καμία εργασία' : 'No tasks yet'}</li>
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
