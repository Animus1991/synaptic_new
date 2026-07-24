/**
 * Off-main-thread workspace compute — PMI/BM25 excerpts, source intelligence, concept map.
 */

import type { WorkspaceWorkerRequest, WorkspaceWorkerResponse } from '../lib/workspaceWorkerClient';
import { buildWorkspaceNoteBundleFromGathered } from '../lib/workspaceNoteContent';

self.onmessage = (event: MessageEvent<WorkspaceWorkerRequest>) => {
  const { id, gathered, buildOpts } = event.data;
  try {
    const bundle = buildWorkspaceNoteBundleFromGathered(gathered, buildOpts, false);
    const response: WorkspaceWorkerResponse = { id, bundle };
    self.postMessage(response);
  } catch (err) {
    const response: WorkspaceWorkerResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};

export {};
