import fs from 'fs';
import path from 'path';

const root = path.resolve('src/components/workspace');
const outDir = path.join(root, 'studyWorkspace');
const lines = fs.readFileSync(path.join(root, 'StudyWorkspace.tsx'), 'utf8').split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

const jsxImports = `import { AnimatePresence, motion } from 'framer-motion';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  X, Maximize2, Minimize2, ChevronRight, Sparkles, PanelLeftClose, PanelLeftOpen, StickyNote,
  LayoutGrid,
} from '@/lib/lucide-shim';
import { cn } from '../../../utils/cn';
import { WorkspaceDock } from '../WorkspaceDock';
import { WorkspaceMobileToolDrawer } from '../WorkspaceMobileToolDrawer';
import { WorkspaceToolStrip } from '../WorkspaceToolStrip';
import { ToolFrame } from '../ToolFrame';
import { workspaceToolLabel } from '../../../lib/workspaceToolRegistry';
import { LessonContent } from '../LessonContent';
import { DraggableConceptMap } from '../DraggableConceptMap';
import { FormulaScratchpad } from '../FormulaScratchpad';
import { CognitiveReader } from '../CognitiveReader';
import {
  LazyAnnotationOverlay,
  LazyComparePanel,
  LazyConceptBusPanel,
  LazyDashboardPanel,
  LazyDebatePanel,
  LazyFeynmanCheck,
  LazyLeitnerPanel,
  LazyQuizPanel,
  LazySimulatorPanel,
  LazyTimerPanel,
  LazyWeakAreasFocusRail,
  LazyWhiteboardPanel,
  LazyWorkspaceDiscoverabilityPanel,
} from '../../../lib/workspaceToolLazyRegistry';
import { WorkspaceIdleMount } from '../WorkspaceIdleMount';
import { WorkspaceToolSuspense } from '../WorkspaceToolSuspense';
import { CommandPalette } from '../CommandPalette';
import { ReprocessPreviewModal } from '../../ReprocessPreviewModal';
import { mergeReaderHighlight } from '../../../lib/workspaceFocus';
import { activityFor } from '../../../lib/workspaceConceptBus';
import { saveConceptMapPositions } from '../../../lib/workspacePersistence';
import { recordQuizResponse } from '../../../lib/quizIrt';
import { conceptSignalForAnnotationCategory } from '../../../lib/annotationAnchor';
import { appendScratchpadAnnotation } from '../../../lib/scratchpadEntryStore';
import { appendCustomLeitnerCard } from '../../../lib/leitnerCustomCards';
import {
  buildAnnotationAgentPrompt,
  buildCompareToolAgentPrompt,
  buildDebateClaimAgentPrompt,
  buildFeynmanToolAgentPrompt,
  buildFormulaAgentPrompt,
  buildScratchpadNoteAgentPrompt,
  type ToolAgentIntent,
} from '../../../lib/workspaceToolAgentPrompts';
import { buildCompareDifferencePrompt } from '../../../lib/compareExplainDifference';
import { saveLastSimulatorScenario, saveExamPracticePreset } from '../../../lib/workspacePersistence';
import { examPracticePresetForScenario, type SimulatorScenarioId } from '../../../lib/examPracticePresets';
import { loadFeynmanDraft } from '../../../lib/feynmanDraftStore';
import { stepHeatDotClass } from '../../../lib/readerHeatmapStepSyncQA';
import { displayWorkspaceStepTitle } from '../../../lib/workspaceContextModel';
import { WorkspaceContextBar } from '../WorkspaceContextBar';
import { WorkspaceIntelSideSheet } from '../WorkspaceIntelSideSheet';
import { WorkspaceKeyboardHelp } from '../WorkspaceKeyboardHelp';
import { WorkspaceSourceStatusBar } from '../WorkspaceSourceStatusBar';
import { nextActionLabel } from '../../../lib/nextActionEngine';
import { ConceptLensPanel } from '../ConceptLensPanel';
import { WorkspaceMobileIntelligenceTabs, intelPanelId } from '../WorkspaceMobileIntelligenceTabs';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import { AVAILABLE_TOOLS, type WorkspaceTool } from './types';
`;

function wrapComponent(name, jsxBody, extra = '') {
  return `${jsxImports}
${extra}
interface ${name}Props {
  model: StudyWorkspaceModel;
}

export function ${name}({ model }: ${name}Props) {
${jsxBody}
}
`;
}

// Chrome: skip link (1765-1772) + mobile (1777-1905) + desktop (1911-1958) + progress (1961-1964) + context bar (1966-1994)
const chromeBody = slice(1765, 1994)
  .split('\n')
  .map((l) => (l ? '  ' + l : l))
  .join('\n');

fs.writeFileSync(
  path.join(outDir, 'StudyWorkspaceChrome.tsx'),
  wrapComponent('StudyWorkspaceChrome', chromeBody),
);

// Lesson panel: 2011-2130 (inside Group)
const lessonBody = slice(2011, 2130)
  .split('\n')
  .map((l) => (l ? '  ' + l : l))
  .join('\n');

fs.writeFileSync(
  path.join(outDir, 'StudyWorkspaceLessonPanel.tsx'),
  wrapComponent('StudyWorkspaceLessonPanel', lessonBody),
);

// Tool surface: 2134-2674
const toolBody = slice(2134, 2674)
  .split('\n')
  .map((l) => (l ? '  ' + l : l))
  .join('\n');

fs.writeFileSync(
  path.join(outDir, 'StudyWorkspaceToolSurface.tsx'),
  wrapComponent('StudyWorkspaceToolSurface', toolBody),
);

// Main layout: dock + group wrapper
const mainLayoutBody = `  const {
    chromeHidden, isMobile, layout, openWorkspaceTool, lang,
  } = model;

  return (
${slice(1998, 2007).split('\n').map((l) => '    ' + l).join('\n')}
        <Group orientation={isMobile ? "vertical" : "horizontal"} className="flex-1 w-full h-full">
          <StudyWorkspaceLessonPanel model={model} />
          <StudyWorkspaceToolSurface model={model} />
        </Group>
      </div>
  );`;

fs.writeFileSync(
  path.join(outDir, 'StudyWorkspaceMainLayout.tsx'),
  `${jsxImports}
import { StudyWorkspaceLessonPanel } from './StudyWorkspaceLessonPanel';
import { StudyWorkspaceToolSurface } from './StudyWorkspaceToolSurface';
import type { StudyWorkspaceModel } from './useStudyWorkspace';

interface StudyWorkspaceMainLayoutProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceMainLayout({ model }: StudyWorkspaceMainLayoutProps) {
${mainLayoutBody}
}
`,
);

// Overlays: 2679-2828
const overlaysBody = slice(2679, 2828)
  .split('\n')
  .map((l) => (l ? '  ' + l : l))
  .join('\n');

fs.writeFileSync(
  path.join(outDir, 'StudyWorkspaceOverlays.tsx'),
  wrapComponent('StudyWorkspaceOverlays', overlaysBody),
);

// Thin shell StudyWorkspace.tsx
const shell = `import { WorkspaceProvider } from './WorkspaceProvider';
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
`;

fs.writeFileSync(path.join(root, 'StudyWorkspace.tsx'), shell);

console.log('Created UI components and thin shell');
