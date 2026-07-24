import { importWithRetry } from './lazyWithRetry';

type StudyWorkspaceBodyModule = typeof import('../components/workspace/StudyWorkspaceBody');

let bodyModulePromise: Promise<StudyWorkspaceBodyModule> | null = null;

/** Shared dynamic import for heavy StudyWorkspace body (useStudyWorkspace graph). */
export function loadStudyWorkspaceBodyModule(): Promise<StudyWorkspaceBodyModule> {
  if (!bodyModulePromise) {
    bodyModulePromise = importWithRetry(
      () => import('../components/workspace/StudyWorkspaceBody'),
      { flow: 'study-workspace-body', retries: 3, reloadOnStaleChunk: true },
    ).catch((err: unknown) => {
      bodyModulePromise = null;
      throw err;
    });
  }
  return bodyModulePromise;
}

export function preloadStudyWorkspaceBody(): void {
  void loadStudyWorkspaceBodyModule().catch(() => undefined);
}
