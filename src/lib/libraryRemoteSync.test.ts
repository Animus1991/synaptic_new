import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { UserSettings } from '../types';

vi.mock('./authClient', () => ({
  configuredProxyBase: vi.fn(() => 'http://localhost:8787'),
  pushRemoteLibrary: vi.fn(async () => ({ updatedAt: new Date().toISOString() })),
}));

vi.mock('./libraryStorage', () => ({
  loadLibrarySync: vi.fn(() => ({
    uploadedFiles: [{ id: 'f1', name: 'notes.txt', extractedText: 'hello' }],
    glossaryEntries: [],
    generatedCourses: [],
  })),
  hydrateLibrary: vi.fn(async (lib: unknown) => lib),
}));

import { configuredProxyBase, pushRemoteLibrary } from './authClient';
import { canAutoSyncLibrary, flushLibraryRemoteSync, scheduleLibraryRemoteSync } from './libraryRemoteSync';

describe('libraryRemoteSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(pushRemoteLibrary).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requires proxy and auth token', () => {
    vi.mocked(configuredProxyBase).mockReturnValueOnce(null);
    expect(canAutoSyncLibrary({} as UserSettings)).toBe(false);
    expect(canAutoSyncLibrary({ llmProxyUrl: 'http://localhost:8787/v1', authToken: 'tok' } as UserSettings)).toBe(true);
  });

  it('debounces remote library push', async () => {
    const settings = { llmProxyUrl: 'http://localhost:8787/v1', authToken: 'tok' } as UserSettings;
    scheduleLibraryRemoteSync(settings);
    expect(pushRemoteLibrary).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4000);
    expect(pushRemoteLibrary).toHaveBeenCalledTimes(1);
  });

  it('flush pushes hydrated library immediately', async () => {
    const settings = { llmProxyUrl: 'http://localhost:8787/v1', authToken: 'tok' } as UserSettings;
    await flushLibraryRemoteSync(settings);
    expect(pushRemoteLibrary).toHaveBeenCalledWith('tok', settings, expect.objectContaining({
      uploadedFiles: expect.any(Array),
    }));
  });
});
