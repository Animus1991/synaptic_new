/**
 * Phase B2 shell entry — re-exports the thin StudyWorkspace orchestrator (~40 lines).
 * Implementation is split under `./studyWorkspace/` (hook + chrome / panels / overlays).
 */
export { StudyWorkspace, StudyWorkspace as StudyWorkspaceShell } from './StudyWorkspace';
export type { StudyWorkspaceProps } from './StudyWorkspace';
