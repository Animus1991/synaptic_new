type StudyWorkspaceModule = typeof import('../components/workspace/StudyWorkspace');

let studyWorkspaceModulePromise: Promise<StudyWorkspaceModule> | null = null;

/** Shared dynamic import for StudyWorkspace (preload + lazy gate use the same promise). */
export function loadStudyWorkspaceModule(): Promise<StudyWorkspaceModule> {
  if (!studyWorkspaceModulePromise) {
    studyWorkspaceModulePromise = import('../components/workspace/StudyWorkspace');
  }
  return studyWorkspaceModulePromise;
}

export function preloadStudyWorkspace(): void {
  void loadStudyWorkspaceModule();
}
