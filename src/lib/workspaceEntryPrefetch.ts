/**
 * B11 entry prefetch — StudyWorkspace shell + reader (default tool) before Continue click.
 */

import { loadReaderModule } from './cognitiveReaderChunk';
import { loadStudyWorkspaceModule } from './studyWorkspaceChunk';
import { injectWorkspaceEntryLinkPrefetch } from './workspaceChunkLinkPrefetch';
import { warmWorkspaceWorker } from './workspaceWorkerClient';

let settledPromise: Promise<void> | null = null;

function markEntryPrefetchReady(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.workspaceEntryPrefetch = 'ready';
}

function ensureSettledTracking(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!settledPromise) {
    warmWorkspaceWorker();
    injectWorkspaceEntryLinkPrefetch();
    settledPromise = Promise.all([
      loadStudyWorkspaceModule().catch(() => undefined),
      loadReaderModule().catch(() => undefined),
    ]).then(() => {
      markEntryPrefetchReady();
    });
  }
  return settledPromise;
}

/** Start fetching workspace shell and reader in parallel (idempotent). */
export function prefetchWorkspaceEntry(): void {
  if (typeof window === 'undefined') return;
  void ensureSettledTracking();
}

/** Resolves when shell + reader module promises settle (for perf E2E warm path). */
export function whenWorkspaceEntryPrefetchSettled(): Promise<void> {
  return ensureSettledTracking();
}

/** Hover/focus handlers for Continue / Open workspace CTAs. */
export function workspaceEntryPrefetchHandlers(): {
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  return {
    onMouseEnter: prefetchWorkspaceEntry,
    onFocus: prefetchWorkspaceEntry,
  };
}

/** Reset for unit tests. */
export function resetWorkspaceEntryPrefetchForTests(): void {
  settledPromise = null;
  if (typeof document !== 'undefined') {
    delete document.documentElement.dataset.workspaceEntryPrefetch;
  }
}
