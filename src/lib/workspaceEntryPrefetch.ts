/**
 * B11 entry prefetch — StudyWorkspace shell + reader (default tool) before Continue click.
 */

import { preloadReaderModule } from './cognitiveReaderChunk';
import { preloadStudyWorkspace } from './studyWorkspaceChunk';
import { injectWorkspaceEntryLinkPrefetch } from './workspaceChunkLinkPrefetch';
import { warmWorkspaceWorker } from './workspaceWorkerClient';

/** Start fetching workspace shell and reader in parallel (idempotent). */
export function prefetchWorkspaceEntry(): void {
  if (typeof window === 'undefined') return;
  warmWorkspaceWorker();
  injectWorkspaceEntryLinkPrefetch();
  preloadStudyWorkspace();
  preloadReaderModule();
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
