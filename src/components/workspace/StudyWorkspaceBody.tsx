import { useEffect } from 'react';
import { WorkspaceProvider } from './WorkspaceProvider';
import { WorkspaceEmptyActionsProvider } from './WorkspaceEmptyActionsContext';
import { cn } from '../../utils/cn';
import { useStudyWorkspace } from './studyWorkspace/useStudyWorkspace';
import { StudyWorkspaceChrome } from './studyWorkspace/StudyWorkspaceChrome';
import { StudyWorkspaceMainLayout } from './studyWorkspace/StudyWorkspaceMainLayout';
import { NotebookWorkspaceLayout } from './studyWorkspace/NotebookWorkspaceLayout';
import { StudyWorkspaceOverlays } from './studyWorkspace/StudyWorkspaceOverlays';
import type { StudyWorkspaceProps } from './studyWorkspace/types';
import { markWorkspaceBodyReady } from '../../lib/workspacePerf';

export type { StudyWorkspaceProps } from './studyWorkspace/types';

/** Heavy workspace body — separate chunk from thin StudyWorkspace shell (1C). */
export function StudyWorkspaceBody(props: StudyWorkspaceProps) {
  const model = useStudyWorkspace(props);

  useEffect(() => {
    markWorkspaceBodyReady();
  }, []);

  return (
    <WorkspaceProvider
      progressKey={model.progressKey}
      lang={model.lang}
      courseId={model.effectiveCourseId}
      hasSource={model.noteBundle.hasSource}
      pipelineVersion={model.noteBundle.pipelineVersion}
    >
      <WorkspaceEmptyActionsProvider resolve={model.resolveEmptyActions}>
      <div
        data-ws-theme="warm"
        className={cn(
          model.agentSplit
            ? 'relative h-full w-full bg-surface-primary flex flex-col'
            : 'fixed inset-0 z-50 bg-surface-primary flex flex-col',
          model.isMobile && !model.chromeHidden && 'pb-20',
        )}
        data-testid="study-workspace"
        data-grounded={model.noteBundle.hasSource ? 'true' : 'false'}
      >
        <StudyWorkspaceChrome model={model} />
        {model.notebookMode && !model.isMobile
          ? <NotebookWorkspaceLayout model={model} />
          : <StudyWorkspaceMainLayout model={model} />}
        <StudyWorkspaceOverlays model={model} />
      </div>
      </WorkspaceEmptyActionsProvider>
    </WorkspaceProvider>
  );
}
