import { Group } from 'react-resizable-panels';
import { WorkspaceDock } from '../WorkspaceDock';
import { ClassicChatDrawer } from './ClassicChatDrawer';
import { StudyWorkspaceLessonPanel } from './StudyWorkspaceLessonPanel';
import { StudyWorkspaceToolSurface } from './StudyWorkspaceToolSurface';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import { AVAILABLE_TOOLS } from './types';

interface StudyWorkspaceMainLayoutProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceMainLayout({ model }: StudyWorkspaceMainLayoutProps) {
  const { chromeHidden, isMobile, activeTool, openWorkspaceTool, lang, studyRoomOpen, setStudyRoomOpen } = model;
  return (
    <div className="relative z-10 flex-1 flex overflow-hidden" id="workspace-main" role="main" tabIndex={-1}>
      {!chromeHidden && !isMobile && (
        <WorkspaceDock
          activeTool={activeTool}
          onSelectTool={openWorkspaceTool}
          availableTools={AVAILABLE_TOOLS}
          lang={lang}
          onOpenStudyRoom={() => setStudyRoomOpen((v) => !v)}
          studyRoomOpen={studyRoomOpen}
        />
      )}
      <Group orientation={isMobile ? 'vertical' : 'horizontal'} className="flex-1 min-h-0 w-full h-full">
        <StudyWorkspaceLessonPanel model={model} />
        <StudyWorkspaceToolSurface model={model} />
        {!isMobile && <ClassicChatDrawer model={model} />}
      </Group>
      {isMobile && <ClassicChatDrawer model={model} />}
    </div>
  );
}
