import fs from 'fs';
import path from 'path';

const root = path.resolve('src/components/workspace');
const outDir = path.join(root, 'studyWorkspace');
const lines = fs.readFileSync(path.join(root, 'StudyWorkspace.tsx'), 'utf8').split('\n');

const hookLines = fs.readFileSync(path.join(outDir, 'useStudyWorkspace.ts'), 'utf8').split('\n');
const returnStart = hookLines.findIndex((l) => l.includes('// props passthrough')) - 1;
const returnEnd = hookLines.findIndex((l, i) => i > returnStart && l.trim() === '};');
const modelKeys = hookLines
  .slice(returnStart + 1, returnEnd)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('//'))
  .map((l) => l.replace(/,$/, ''));

const destructuring = `  const {\n    ${modelKeys.join(',\n    ')},\n  } = model;\n`;

function slice(start, end) {
  return lines.slice(start - 1, end);
}

function makeComponent(name, jsxLines, extraImports = '') {
  const jsx = jsxLines.map((l) => '      ' + l).join('\n');
  const imports = getImportsForComponent(name);

  return `${imports}
${extraImports}
import type { StudyWorkspaceModel } from './useStudyWorkspace';

interface ${name}Props {
  model: StudyWorkspaceModel;
}

export function ${name}({ model }: ${name}Props) {
${destructuring}
  return (
    <>
${jsx}
    </>
  );
}
`;
}

function getImportsForComponent(name) {
  const common = `import { cn } from '../../../utils/cn';`;
  const map = {
    StudyWorkspaceChrome: `${common}
import {
  X, Maximize2, Minimize2, Sparkles, StickyNote,
} from '@/lib/lucide-shim';
import { workspaceToolLabel } from '../../../lib/workspaceToolRegistry';
import { displayWorkspaceStepTitle } from '../../../lib/workspaceContextModel';
import { WorkspaceContextBar } from '../WorkspaceContextBar';
import { ConceptLensPanel } from '../ConceptLensPanel';`,
    StudyWorkspaceLessonPanel: `${common}
import { Panel, Separator } from 'react-resizable-panels';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from '@/lib/lucide-shim';
import { LessonContent } from '../LessonContent';
import { recordQuizResponse } from '../../../lib/quizIrt';
import { stepHeatDotClass } from '../../../lib/readerHeatmapStepSyncQA';
import { displayWorkspaceStepTitle } from '../../../lib/workspaceContextModel';
import { WorkspaceSourceStatusBar } from '../WorkspaceSourceStatusBar';`,
    StudyWorkspaceToolSurface: `${common}
import { Panel } from 'react-resizable-panels';
import { WorkspaceToolStrip } from '../WorkspaceToolStrip';
import { ToolFrame } from '../ToolFrame';
import { DraggableConceptMap } from '../DraggableConceptMap';
import { FormulaScratchpad } from '../FormulaScratchpad';
import { CognitiveReader } from '../CognitiveReader';
import {
  LazyAnnotationOverlay, LazyComparePanel, LazyConceptBusPanel, LazyDashboardPanel,
  LazyDebatePanel, LazyFeynmanCheck, LazyLeitnerPanel, LazyQuizPanel, LazySimulatorPanel,
  LazyTimerPanel, LazyWeakAreasFocusRail, LazyWhiteboardPanel, LazyWorkspaceDiscoverabilityPanel,
} from '../../../lib/workspaceToolLazyRegistry';
import { WorkspaceIdleMount } from '../WorkspaceIdleMount';
import { WorkspaceToolSuspense } from '../WorkspaceToolSuspense';
import { mergeReaderHighlight } from '../../../lib/workspaceFocus';
import { activityFor } from '../../../lib/workspaceConceptBus';
import { saveConceptMapPositions } from '../../../lib/workspacePersistence';
import { recordQuizResponse } from '../../../lib/quizIrt';
import { conceptSignalForAnnotationCategory } from '../../../lib/annotationAnchor';
import { appendScratchpadAnnotation } from '../../../lib/scratchpadEntryStore';
import { appendCustomLeitnerCard } from '../../../lib/leitnerCustomCards';
import {
  buildAnnotationAgentPrompt, buildCompareToolAgentPrompt, buildDebateClaimAgentPrompt,
  buildFeynmanToolAgentPrompt, buildFormulaAgentPrompt, buildScratchpadNoteAgentPrompt,
  type ToolAgentIntent,
} from '../../../lib/workspaceToolAgentPrompts';
import { buildCompareDifferencePrompt } from '../../../lib/compareExplainDifference';
import { saveLastSimulatorScenario, saveExamPracticePreset } from '../../../lib/workspacePersistence';
import { examPracticePresetForScenario, type SimulatorScenarioId } from '../../../lib/examPracticePresets';
import { loadFeynmanDraft } from '../../../lib/feynmanDraftStore';
import { ConceptLensPanel } from '../ConceptLensPanel';
import { WorkspaceMobileIntelligenceTabs, intelPanelId } from '../WorkspaceMobileIntelligenceTabs';
import { AVAILABLE_TOOLS, type WorkspaceTool } from './types';`,
    StudyWorkspaceOverlays: `${common}
import { AnimatePresence, motion } from 'framer-motion';
import { X, StickyNote, LayoutGrid } from '@/lib/lucide-shim';
import { workspaceToolLabel } from '../../../lib/workspaceToolRegistry';
import { CommandPalette } from '../CommandPalette';
import { ReprocessPreviewModal } from '../../ReprocessPreviewModal';
import { WorkspaceIntelSideSheet } from '../WorkspaceIntelSideSheet';
import { WorkspaceKeyboardHelp } from '../WorkspaceKeyboardHelp';
import { WorkspaceMobileToolDrawer } from '../WorkspaceMobileToolDrawer';
import { nextActionLabel } from '../../../lib/nextActionEngine';
import { AVAILABLE_TOOLS, type WorkspaceTool } from './types';`,
  };
  return map[name] || common;
}

fs.writeFileSync(path.join(outDir, 'StudyWorkspaceChrome.tsx'), makeComponent('StudyWorkspaceChrome', slice(1765, 1994)));
fs.writeFileSync(path.join(outDir, 'StudyWorkspaceLessonPanel.tsx'), makeComponent('StudyWorkspaceLessonPanel', slice(2011, 2131)));
fs.writeFileSync(path.join(outDir, 'StudyWorkspaceToolSurface.tsx'), makeComponent('StudyWorkspaceToolSurface', slice(2134, 2675)));
fs.writeFileSync(path.join(outDir, 'StudyWorkspaceOverlays.tsx'), makeComponent('StudyWorkspaceOverlays', slice(2679, 2828)));

const mainLayout = `import { Group } from 'react-resizable-panels';
import { WorkspaceDock } from '../WorkspaceDock';
import { StudyWorkspaceLessonPanel } from './StudyWorkspaceLessonPanel';
import { StudyWorkspaceToolSurface } from './StudyWorkspaceToolSurface';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import { AVAILABLE_TOOLS } from './types';

interface StudyWorkspaceMainLayoutProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceMainLayout({ model }: StudyWorkspaceMainLayoutProps) {
  const { chromeHidden, isMobile, activeTool, openWorkspaceTool, lang } = model;
  return (
    <div className="relative z-10 flex-1 flex overflow-hidden" id="workspace-main" role="main" tabIndex={-1}>
      {!chromeHidden && !isMobile && (
        <WorkspaceDock
          activeTool={activeTool}
          onSelectTool={openWorkspaceTool}
          availableTools={AVAILABLE_TOOLS}
          lang={lang}
        />
      )}
      <Group orientation={isMobile ? 'vertical' : 'horizontal'} className="flex-1 w-full h-full">
        <StudyWorkspaceLessonPanel model={model} />
        <StudyWorkspaceToolSurface model={model} />
      </Group>
    </div>
  );
}
`;
fs.writeFileSync(path.join(outDir, 'StudyWorkspaceMainLayout.tsx'), mainLayout);

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
console.log('Done, keys:', modelKeys.length);
