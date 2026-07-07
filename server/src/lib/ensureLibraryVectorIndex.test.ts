import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getVectorChunkStore, resetVectorChunkStoreForTests } from '../store/vectorChunkStore';
import { buildDesiredChunks } from './libraryVectorIndex';
import { resetVectorIndexProgress } from './vectorIndexProgress';

const enqueueMock = vi.fn();

vi.mock('../jobs/vectorIndexQueue', () => ({
  enqueueLibraryVectorIndex: (...args: unknown[]) => enqueueMock(...args),
}));

import { ensureLibraryVectorIndexIfNeeded } from './ensureLibraryVectorIndex';

const sampleLibrary = {
  uploadedFiles: [
    {
      id: 'f1',
      name: 'notes.pdf',
      extractedText:
        'Price elasticity of demand measures how quantity demanded responds to price changes across markets and time.\n\n' +
        'Elastic goods see larger percentage shifts than inelastic goods when prices move.',
      status: 'analyzed',
    },
  ],
  glossaryEntries: [],
  generatedCourses: [],
  updatedAt: new Date().toISOString(),
};

describe('ensureLibraryVectorIndexIfNeeded', () => {
  beforeEach(() => {
    resetVectorChunkStoreForTests();
    resetVectorIndexProgress();
    enqueueMock.mockClear();
  });

  it('enqueues when library has text but the account index is empty', async () => {
    const result = await ensureLibraryVectorIndexIfNeeded('acct1', sampleLibrary);
    expect(result.enqueued).toBe(true);
    expect(result.desiredChunks).toBeGreaterThan(0);
    expect(enqueueMock).toHaveBeenCalledWith('acct1', sampleLibrary);
  });

  it('skips when indexed chunks already cover desired chunks', async () => {
    const { chunks } = buildDesiredChunks(sampleLibrary);
    await getVectorChunkStore().replaceAccountChunks(
      'acct1',
      chunks.map((chunk, index) => ({
        ...chunk,
        index,
        embedding: [1, 0, 0],
      })),
    );

    const result = await ensureLibraryVectorIndexIfNeeded('acct1', sampleLibrary);
    expect(result.enqueued).toBe(false);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('skips when library has no indexable text', async () => {
    const result = await ensureLibraryVectorIndexIfNeeded('acct1', {
      ...sampleLibrary,
      uploadedFiles: [{ id: 'f1', name: 'empty.pdf', status: 'analyzed' }],
    });
    expect(result.enqueued).toBe(false);
    expect(result.desiredChunks).toBe(0);
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});
