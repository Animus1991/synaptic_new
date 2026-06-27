import { importWithRetry } from './lazyWithRetry';

type CognitiveReaderModule = typeof import('../components/workspace/CognitiveReader');

let readerModulePromise: Promise<CognitiveReaderModule> | null = null;

/** Shared dynamic import for CognitiveReader (lazy tool + entry prefetch). */
export function loadReaderModule(): Promise<CognitiveReaderModule> {
  if (!readerModulePromise) {
    readerModulePromise = importWithRetry(
      () => import('../components/workspace/CognitiveReader'),
      { flow: 'cognitive-reader', retries: 3, reloadOnStaleChunk: true },
    ).catch((err: unknown) => {
      readerModulePromise = null;
      throw err;
    });
  }
  return readerModulePromise;
}

export function preloadReaderModule(): void {
  void loadReaderModule().catch(() => {
    /* surfaced again when LazyCognitiveReader mounts */
  });
}
