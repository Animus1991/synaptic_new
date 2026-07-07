import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { UserSettings } from '../types';

vi.mock('./authClient', () => ({
  configuredProxyBase: vi.fn(() => 'http://localhost:8787'),
  ragIndexLibrary: vi.fn(async () => ({ indexedChunks: 4 })),
}));

vi.mock('./orgClient', () => ({
  fetchRagStatus: vi.fn(),
}));

import { configuredProxyBase, ragIndexLibrary } from './authClient';
import { fetchRagStatus } from './orgClient';
import { countIndexableFiles, ensureServerRagIndex } from './serverRagBootstrap';

const settings = { llmProxyUrl: 'http://localhost:8787/v1', authToken: 'tok' } as UserSettings;

const library = {
  uploadedFiles: [{ extractedText: 'Elasticity measures responsiveness.', status: 'analyzed' }],
  glossaryEntries: [],
  generatedCourses: [],
};

describe('serverRagBootstrap', () => {
  beforeEach(() => {
    vi.mocked(fetchRagStatus).mockReset();
    vi.mocked(ragIndexLibrary).mockClear();
    vi.mocked(configuredProxyBase).mockReturnValue('http://localhost:8787');
  });

  it('counts indexable files with extracted text', () => {
    expect(countIndexableFiles(library)).toBe(1);
    expect(countIndexableFiles({ ...library, uploadedFiles: [{ status: 'analyzed' }] })).toBe(0);
  });

  it('skips rebuild when server index is already ready', async () => {
    vi.mocked(fetchRagStatus).mockResolvedValue({
      indexedChunks: 3,
      ready: true,
      indexing: { status: 'completed', progress: 100, targetChunks: 3, embedded: 1, reused: 2 },
    });

    const result = await ensureServerRagIndex('tok', settings, library);
    expect(result.triggered).toBe(false);
    expect(result.indexedChunks).toBe(3);
    expect(ragIndexLibrary).not.toHaveBeenCalled();
  });

  it('triggers rebuild when signed in but server index is empty', async () => {
    vi.mocked(fetchRagStatus).mockResolvedValue({
      indexedChunks: 0,
      ready: false,
      indexing: { status: 'idle', progress: 0, targetChunks: 0, embedded: 0, reused: 0 },
    });

    const result = await ensureServerRagIndex('tok', settings, library);
    expect(result.triggered).toBe(true);
    expect(result.indexedChunks).toBe(4);
    expect(ragIndexLibrary).toHaveBeenCalledWith('tok', settings, library);
  });

  it('skips when proxy is not configured', async () => {
    vi.mocked(configuredProxyBase).mockReturnValueOnce(null);
    const result = await ensureServerRagIndex('tok', settings, library);
    expect(result.triggered).toBe(false);
    expect(fetchRagStatus).not.toHaveBeenCalled();
  });
});
