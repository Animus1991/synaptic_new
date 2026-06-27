/**
 * Off-main-thread workspace compute — PMI/BM25 excerpts, source intelligence, concept map.
 * Falls back to sync path when Worker is unavailable.
 */

import type { BuildWorkspaceNoteBundleOpts } from '../lib/workspaceNoteContent';
import { buildWorkspaceNoteBundle } from '../lib/workspaceNoteContent';

export type WorkspaceWorkerRequest = {
  id: string;
  opts: BuildWorkspaceNoteBundleOpts;
};

export type WorkspaceWorkerResponse = {
  id: string;
  bundle: ReturnType<typeof buildWorkspaceNoteBundle>;
};

self.onmessage = (event: MessageEvent<WorkspaceWorkerRequest>) => {
  const { id, opts } = event.data;
  try {
    const bundle = buildWorkspaceNoteBundle(opts);
    const response: WorkspaceWorkerResponse = { id, bundle };
    self.postMessage(response);
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};

export {};
