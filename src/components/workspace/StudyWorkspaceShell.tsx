/**
 * Phase B2 shell entry — thin re-export while StudyWorkspace.tsx is split incrementally.
 * Import from here in routes; the implementation lives in StudyWorkspace until <300-line extraction completes.
 */
export { StudyWorkspace, StudyWorkspace as StudyWorkspaceShell } from './StudyWorkspace';
