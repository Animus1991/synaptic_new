/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../lib/studyWorkspaceChunk', () => ({
  loadStudyWorkspaceModule: vi.fn(() => Promise.resolve({})),
  preloadStudyWorkspace: vi.fn(),
}));

vi.mock('../../lib/cognitiveReaderChunk', () => ({
  loadReaderModule: vi.fn(() => Promise.resolve({})),
  preloadReaderModule: vi.fn(),
}));

vi.mock('../../lib/workspaceWorkerClient', () => ({
  warmWorkspaceWorker: vi.fn(),
}));

vi.mock('../../lib/studyWorkspaceBodyChunk', () => ({
  loadStudyWorkspaceBodyModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../lib/workspaceChunkLinkPrefetch', () => ({
  injectWorkspaceEntryLinkPrefetch: vi.fn(),
}));

import {
  prefetchWorkspaceEntry,
  resetWorkspaceEntryPrefetchForTests,
  whenWorkspaceEntryPrefetchSettled,
  workspaceEntryPrefetchHandlers,
} from './workspaceEntryPrefetch';
import { loadStudyWorkspaceModule } from '../../lib/studyWorkspaceChunk';
import { loadReaderModule } from '../../lib/cognitiveReaderChunk';
import { warmWorkspaceWorker } from '../../lib/workspaceWorkerClient';
import { injectWorkspaceEntryLinkPrefetch } from '../../lib/workspaceChunkLinkPrefetch';

describe('workspaceEntryPrefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadStudyWorkspaceModule).mockImplementation(() => Promise.resolve({} as never));
    vi.mocked(loadReaderModule).mockImplementation(() => Promise.resolve({} as never));
    resetWorkspaceEntryPrefetchForTests();
  });

  it('prefetches shell, reader, worker warm-up, and link hints together', async () => {
    prefetchWorkspaceEntry();
    await whenWorkspaceEntryPrefetchSettled();
    expect(warmWorkspaceWorker).toHaveBeenCalledTimes(1);
    expect(injectWorkspaceEntryLinkPrefetch).toHaveBeenCalledTimes(1);
    expect(loadStudyWorkspaceModule).toHaveBeenCalledTimes(1);
    expect(loadReaderModule).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.workspaceEntryPrefetch).toBe('ready');
  });

  it('exposes hover/focus handlers that prefetch', async () => {
    const handlers = workspaceEntryPrefetchHandlers();
    handlers.onMouseEnter();
    await whenWorkspaceEntryPrefetchSettled();
    handlers.onFocus();
    await whenWorkspaceEntryPrefetchSettled();
    expect(loadStudyWorkspaceModule).toHaveBeenCalledTimes(1);
    expect(loadReaderModule).toHaveBeenCalledTimes(1);
  });
});
