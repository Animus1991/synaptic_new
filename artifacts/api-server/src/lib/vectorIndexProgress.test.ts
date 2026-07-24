import { describe, it, expect, beforeEach } from 'vitest';
import {
  getVectorIndexProgress,
  markVectorIndexQueued,
  markVectorIndexProcessing,
  markVectorIndexBatchProgress,
  markVectorIndexComplete,
  markVectorIndexFailed,
  resetVectorIndexProgress,
} from './vectorIndexProgress';

describe('vectorIndexProgress', () => {
  beforeEach(() => resetVectorIndexProgress());

  it('starts idle', () => {
    expect(getVectorIndexProgress('acc-1').status).toBe('idle');
  });

  it('tracks queued → processing → complete lifecycle', () => {
    markVectorIndexQueued('acc-1');
    expect(getVectorIndexProgress('acc-1').status).toBe('queued');

    markVectorIndexProcessing('acc-1', 10);
    expect(getVectorIndexProgress('acc-1').status).toBe('processing');
    expect(getVectorIndexProgress('acc-1').targetChunks).toBe(10);

    markVectorIndexBatchProgress('acc-1', { embedded: 4, reused: 2, targetChunks: 10 });
    expect(getVectorIndexProgress('acc-1').progress).toBeGreaterThan(10);

    markVectorIndexComplete('acc-1', { indexedChunks: 10, embedded: 4, reused: 6, removed: 0 });
    expect(getVectorIndexProgress('acc-1').status).toBe('completed');
    expect(getVectorIndexProgress('acc-1').progress).toBe(100);
  });

  it('records failure', () => {
    markVectorIndexFailed('acc-1', 'embed failed');
    expect(getVectorIndexProgress('acc-1').status).toBe('failed');
    expect(getVectorIndexProgress('acc-1').error).toBe('embed failed');
  });
});
