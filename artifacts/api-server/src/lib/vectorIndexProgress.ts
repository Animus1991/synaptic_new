import type { IndexStats } from './libraryVectorIndex';

export type VectorIndexStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

export type VectorIndexProgress = {
  status: VectorIndexStatus;
  progress: number;
  indexedChunks: number;
  targetChunks: number;
  embedded: number;
  reused: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

const progressByAccount = new Map<string, VectorIndexProgress>();

function defaultProgress(): VectorIndexProgress {
  return {
    status: 'idle',
    progress: 0,
    indexedChunks: 0,
    targetChunks: 0,
    embedded: 0,
    reused: 0,
  };
}

function setProgress(accountId: string, row: VectorIndexProgress): void {
  progressByAccount.set(accountId, row);
}

export function getVectorIndexProgress(accountId: string): VectorIndexProgress {
  return progressByAccount.get(accountId) ?? defaultProgress();
}

export function markVectorIndexQueued(accountId: string): void {
  const prev = getVectorIndexProgress(accountId);
  if (prev.status === 'processing') return;
  setProgress(accountId, {
    ...defaultProgress(),
    status: 'queued',
    startedAt: new Date().toISOString(),
  });
}

export function markVectorIndexProcessing(accountId: string, targetChunks: number): void {
  setProgress(accountId, {
    status: 'processing',
    progress: targetChunks > 0 ? 5 : 100,
    indexedChunks: 0,
    targetChunks,
    embedded: 0,
    reused: 0,
    startedAt: getVectorIndexProgress(accountId).startedAt ?? new Date().toISOString(),
  });
}

export function markVectorIndexBatchProgress(
  accountId: string,
  update: { embedded: number; reused: number; targetChunks: number },
): void {
  const done = update.reused + update.embedded;
  const progress =
    update.targetChunks > 0
      ? Math.min(99, Math.round(10 + (done / update.targetChunks) * 85))
      : 100;
  setProgress(accountId, {
    status: 'processing',
    progress,
    indexedChunks: done,
    targetChunks: update.targetChunks,
    embedded: update.embedded,
    reused: update.reused,
    startedAt: getVectorIndexProgress(accountId).startedAt,
  });
}

export function markVectorIndexComplete(accountId: string, stats: IndexStats): void {
  setProgress(accountId, {
    status: 'completed',
    progress: 100,
    indexedChunks: stats.indexedChunks,
    targetChunks: stats.indexedChunks,
    embedded: stats.embedded,
    reused: stats.reused,
    startedAt: getVectorIndexProgress(accountId).startedAt,
    completedAt: new Date().toISOString(),
  });
}

export function markVectorIndexFailed(accountId: string, error: string): void {
  const prev = getVectorIndexProgress(accountId);
  setProgress(accountId, {
    ...prev,
    status: 'failed',
    error,
    completedAt: new Date().toISOString(),
  });
}

/** Test helper */
export function resetVectorIndexProgress(): void {
  progressByAccount.clear();
}
