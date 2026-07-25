import { extractImportUrl } from './chunkErrorReporter';
import { importWithRetry } from './lazyWithRetry';

type StudyWorkspaceModule = typeof import('../components/workspace/StudyWorkspace');

let studyWorkspaceModulePromise: Promise<StudyWorkspaceModule> | null = null;

async function importStudyWorkspace(): Promise<StudyWorkspaceModule> {
  try {
    return await import('../components/workspace/StudyWorkspace');
  } catch (err) {
    const url = extractImportUrl(err);
    if (!url || typeof window === 'undefined') throw err;
    const busted = new URL(url, window.location.href);
    busted.searchParams.set('synapse_retry', String(Date.now()));
    return import(/* @vite-ignore */ busted.href) as Promise<StudyWorkspaceModule>;
  }
}

/** Shared dynamic import for StudyWorkspace (preload + lazy gate use the same promise). */
export function loadStudyWorkspaceModule(): Promise<StudyWorkspaceModule> {
  if (!studyWorkspaceModulePromise) {
    studyWorkspaceModulePromise = importWithRetry(importStudyWorkspace, {
      flow: 'study-workspace',
      retries: 3,
      reloadOnStaleChunk: true,
    }).catch((err: unknown) => {
      // Reset so the next call can retry instead of being stuck with a rejected promise.
      studyWorkspaceModulePromise = null;
      throw err;
    });
  }
  return studyWorkspaceModulePromise;
}

export function preloadStudyWorkspace(): void {
  // Prefetch must never hard-reload the page on failure (unlike open-time load).
  void importWithRetry(importStudyWorkspace, {
    flow: 'prefetch:study-workspace',
    retries: 2,
    reloadOnStaleChunk: false,
  })
    .then((mod) => {
      studyWorkspaceModulePromise ??= Promise.resolve(mod);
    })
    .catch(() => {
      /* swallow — surfaced again when StudyWorkspaceLazy retries */
    });
}
