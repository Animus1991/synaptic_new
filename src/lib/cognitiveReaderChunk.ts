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
  void importWithRetry(
    () => import('../components/workspace/CognitiveReader'),
    { flow: 'prefetch:cognitive-reader', retries: 2, reloadOnStaleChunk: false },
  )
    .then((mod) => {
      readerModulePromise ??= Promise.resolve(mod);
    })
    .catch(() => {
      /* surfaced again when LazyCognitiveReader mounts */
    });
}
