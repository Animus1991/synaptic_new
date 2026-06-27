import { WorkspaceProvider } from './WorkspaceProvider';
import { cn } from '../../utils/cn';
import { useStudyWorkspace } from './studyWorkspace/useStudyWorkspace';
import { StudyWorkspaceChrome } from './studyWorkspace/StudyWorkspaceChrome';
import { StudyWorkspaceMainLayout } from './studyWorkspace/StudyWorkspaceMainLayout';
import { StudyWorkspaceOverlays } from './studyWorkspace/StudyWorkspaceOverlays';
import type { StudyWorkspaceProps } from './studyWorkspace/types';

export type { StudyWorkspaceProps } from './studyWorkspace/types';

export function StudyWorkspace(props: StudyWorkspaceProps) {
  const model = useStudyWorkspace(props);

  return (
    <WorkspaceProvider
      progressKey={model.progressKey}
      lang={model.lang}
      courseId={model.effectiveCourseId}
      hasSource={model.noteBundle.hasSource}
      pipelineVersion={model.noteBundle.pipelineVersion}
    >
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
        <StudyWorkspaceMainLayout model={model} />
        <StudyWorkspaceOverlays model={model} />
      </div>
    </WorkspaceProvider>
  );
}
