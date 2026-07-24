import type { UserSettings } from '../types';
import { notifyError, notifySuccess, notifyWarning } from './notificationBus';
import { canAutoSyncLibrary, flushLibraryRemoteSync } from './libraryRemoteSync';
import { loadJson, saveJson } from './persistence';

const QUEUE_KEY = 'offline-sync-queue';

export type OfflineSyncJob = {
  id: string;
  kind: 'library-push';
  enqueuedAt: string;
};

function loadQueue(): OfflineSyncJob[] {
  return loadJson<OfflineSyncJob[]>(QUEUE_KEY, []);
}

function saveQueue(jobs: OfflineSyncJob[]): void {
  saveJson(QUEUE_KEY, jobs);
}

export function getOfflineSyncQueue(): OfflineSyncJob[] {
  return loadQueue();
}

export function enqueueOfflineSync(job: Omit<OfflineSyncJob, 'id' | 'enqueuedAt'>): void {
  const queue = loadQueue();
  if (queue.some((j) => j.kind === job.kind)) return;
  queue.push({
    id: `sync-${Date.now()}`,
    kind: job.kind,
    enqueuedAt: new Date().toISOString(),
  });
  saveQueue(queue);
}

export function clearOfflineSyncQueue(): void {
  saveQueue([]);
}

export async function flushOfflineSyncQueue(
  settings: UserSettings,
  online = typeof navigator !== 'undefined' ? navigator.onLine : true,
): Promise<{ flushed: number; remaining: number }> {
  if (!online || !canAutoSyncLibrary(settings)) {
    return { flushed: 0, remaining: loadQueue().length };
  }
  const queue = loadQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  let flushed = 0;
  const remaining: OfflineSyncJob[] = [];
  for (const job of queue) {
    try {
      if (job.kind === 'library-push') {
        await flushLibraryRemoteSync(settings);
      }
      flushed += 1;
    } catch {
      remaining.push(job);
    }
  }
  saveQueue(remaining);
  if (flushed > 0) {
    notifySuccess('Library synced', `${flushed} pending upload${flushed > 1 ? 's' : ''} completed`);
  }
  if (remaining.length > 0) {
    notifyWarning('Sync pending', `${remaining.length} item(s) will retry when online`);
  }
  return { flushed, remaining: remaining.length };
}

export function handleLibrarySyncFailure(settings: UserSettings, online: boolean): void {
  if (!canAutoSyncLibrary(settings)) return;
  if (!online) {
    enqueueOfflineSync({ kind: 'library-push' });
    notifyWarning('Offline — sync queued', 'Library changes will upload when you reconnect');
    return;
  }
  notifyError('Library sync failed', 'Will retry automatically');
}
