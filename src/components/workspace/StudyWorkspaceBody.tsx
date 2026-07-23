import { useEffect, useMemo } from 'react';
import { WorkspaceProvider } from './WorkspaceProvider';
import { WorkspaceEmptyActionsProvider } from './WorkspaceEmptyActionsContext';
import { WorkspaceStatusBusProvider } from '../../lib/workspaceStatusBus';
import { cn } from '../../utils/cn';
import { useStudyWorkspace } from './studyWorkspace/useStudyWorkspace';
import { StudyWorkspaceChrome } from './studyWorkspace/StudyWorkspaceChrome';
import { StudyWorkspaceMainLayout } from './studyWorkspace/StudyWorkspaceMainLayout';
import { NotebookWorkspaceLayout } from './studyWorkspace/NotebookWorkspaceLayout';
import { StudyWorkspaceOverlays } from './studyWorkspace/StudyWorkspaceOverlays';
import { WorkspaceStatusPanel } from './WorkspaceStatusPanel';
import type { StudyWorkspaceProps } from './studyWorkspace/types';
import { markWorkspaceBodyReady } from '../../lib/workspacePerf';
import { useMinimalTheme } from '../../lib/useMinimalTheme';
import { resolveChromeDensity } from '../../lib/chromeDensity';

export type { StudyWorkspaceProps } from './studyWorkspace/types';

/** Heavy workspace body — separate chunk from thin StudyWorkspace shell (1C). */
export function StudyWorkspaceBody(props: StudyWorkspaceProps) {
  const model = useStudyWorkspace(props);
  const isMinimal = useMinimalTheme();
  const density = resolveChromeDensity(
    props.userSettings?.chromeDensity,
    props.userSettings?.language === 'el' ? 'el' : 'en',
  );
  const mirrorInPanel = useMemo(
    () => isMinimal || density === 'compact',
    [isMinimal, density],
  );

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
      <WorkspaceStatusBusProvider mirrorInPanel={mirrorInPanel}>
      <WorkspaceEmptyActionsProvider resolve={model.resolveEmptyActions}>
      <div
        data-ws-theme="warm"
        data-status-mirror={mirrorInPanel ? 'true' : undefined}
        className={cn(
          model.agentSplit
            ? 'relative h-full w-full bg-surface-primary flex flex-col'
            : 'fixed inset-0 z-50 bg-surface-primary flex flex-col',
          model.shellNavClearance && !model.chromeHidden && !model.notebookMode && 'pb-20',
          model.shellNavClearance && model.notebookMode && !model.chromeHidden && 'pb-2',
          /* OPT-R13 — workspace canvas primacy under Minimal */
          isMinimal && 'workspace-canvas',
        )}
        data-testid="study-workspace"
        data-grounded={model.noteBundle.hasSource ? 'true' : 'false'}
      >
        <StudyWorkspaceChrome model={model} />
        {model.notebookMode
          ? <NotebookWorkspaceLayout model={model} />
          : <StudyWorkspaceMainLayout model={model} />}
        {/* OPT-R11 — bottom console dock under Minimal (toggleable; no alert loss). */}
        {isMinimal && !model.chromeHidden ? (
          <WorkspaceStatusPanel className="status-console-dock" defaultOpen={false} />
        ) : null}
        <StudyWorkspaceOverlays model={model} />
      </div>
      </WorkspaceEmptyActionsProvider>
      </WorkspaceStatusBusProvider>
    </WorkspaceProvider>
  );
}
