/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./studyWorkspaceChunk', () => ({
  preloadStudyWorkspace: vi.fn(),
}));

vi.mock('./cognitiveReaderChunk', () => ({
  preloadReaderModule: vi.fn(),
}));

vi.mock('./workspaceWorkerClient', () => ({
  warmWorkspaceWorker: vi.fn(),
}));

vi.mock('./workspaceChunkLinkPrefetch', () => ({
  injectWorkspaceEntryLinkPrefetch: vi.fn(),
}));

import { prefetchWorkspaceEntry, workspaceEntryPrefetchHandlers } from './workspaceEntryPrefetch';
import { preloadStudyWorkspace } from './studyWorkspaceChunk';
import { preloadReaderModule } from './cognitiveReaderChunk';
import { warmWorkspaceWorker } from './workspaceWorkerClient';
import { injectWorkspaceEntryLinkPrefetch } from './workspaceChunkLinkPrefetch';

describe('workspaceEntryPrefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefetches shell, reader, worker warm-up, and link hints together', () => {
    prefetchWorkspaceEntry();
    expect(warmWorkspaceWorker).toHaveBeenCalledTimes(1);
    expect(injectWorkspaceEntryLinkPrefetch).toHaveBeenCalledTimes(1);
    expect(preloadStudyWorkspace).toHaveBeenCalledTimes(1);
    expect(preloadReaderModule).toHaveBeenCalledTimes(1);
  });

  it('exposes hover/focus handlers that prefetch', () => {
    const handlers = workspaceEntryPrefetchHandlers();
    handlers.onMouseEnter();
    expect(preloadStudyWorkspace).toHaveBeenCalled();
    handlers.onFocus();
    expect(preloadReaderModule).toHaveBeenCalledTimes(2);
  });
});
