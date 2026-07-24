import { importWithRetry } from './lazyWithRetry';

type StudyWorkspaceModule = typeof import('../components/workspace/StudyWorkspace');

let studyWorkspaceModulePromise: Promise<StudyWorkspaceModule> | null = null;

/** Shared dynamic import for StudyWorkspace (preload + lazy gate use the same promise). */
export function loadStudyWorkspaceModule(): Promise<StudyWorkspaceModule> {
  if (!studyWorkspaceModulePromise) {
    studyWorkspaceModulePromise = importWithRetry(
      () => import('../components/workspace/StudyWorkspace'),
      { flow: 'study-workspace', retries: 3, reloadOnStaleChunk: true },
    ).catch((err: unknown) => {
      // Reset so the next call can retry instead of being stuck with a rejected promise.
      studyWorkspaceModulePromise = null;
      throw err;
    });
  }
  return studyWorkspaceModulePromise;
}

export function preloadStudyWorkspace(): void {
  void loadStudyWorkspaceModule().catch(() => {
    /* swallow — surfaced again when StudyWorkspaceLazy retries */
  });
}
