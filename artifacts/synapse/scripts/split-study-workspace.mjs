import fs from 'fs';
import path from 'path';

const root = path.resolve('src/components/workspace');
const src = fs.readFileSync(path.join(root, 'StudyWorkspace.tsx'), 'utf8');
const lines = src.split('\n');

// Line numbers are 1-indexed in our mental model; array is 0-indexed
const typesStart = lines.findIndex((l) => l.startsWith('type WorkspaceTool'));
const typesEnd = lines.findIndex((l) => l === '];', typesStart) + 1; // end of AVAILABLE_TOOLS
const funcStart = lines.findIndex((l) => l.startsWith('export function StudyWorkspace'));
const hookBodyStart = lines.findIndex((l, i) => i > funcStart && l.trim().startsWith('const { t, lang }'));
const returnStart = lines.findIndex((l) => l.trim() === 'return (');
const funcEnd = lines.length - 1; // closing brace

const importLines = lines.slice(0, typesStart).filter((l) => !l.startsWith('import { useState'));

// types.ts
const typesContent = `import type { WorkspaceToolId } from '../../../lib/taskFlows';
import type { Course, GlossaryEntry, LearnerModel, Task, UploadedFile, UserSettings } from '../../../types';
import type { WorkspaceFocus } from '../../../lib/workspaceFocus';
import type { OpenAgentFromWorkspaceOpts } from '../../../lib/agentWorkspaceContext';
import type { WorkspaceLiveSync } from '../../../lib/workspaceStoreSpine';
import type { SourceHighlight } from '../../../lib/conceptProvenance';
import type { FsrsRating } from '../../../lib/pedagogy';

export type WorkspaceTool = WorkspaceToolId;
export type LayoutMode = 'split' | 'focus-lesson' | 'focus-tool' | 'zen';

export interface StudyWorkspaceProps {
  onClose: () => void;
  onOpenAgent: () => void;
  onOpenAgentWithPrompt?: (opts: OpenAgentFromWorkspaceOpts) => void;
  onComplete?: () => void;
  taskTitle?: string;
  courseName?: string;
  quizConcept?: string;
  xpReward?: number;
  initialTool?: WorkspaceTool;
  taskId?: string | null;
  learnerModel?: LearnerModel;
  dashboardStats?: { streak: number; reviewsDue: number; studyTimeToday?: number; studyTimeWeek?: number };
  conceptBars?: { concept: string; mastery: number }[];
  uploadedFiles?: UploadedFile[];
  glossaryEntries?: GlossaryEntry[];
  courses?: Course[];
  courseId?: string;
  onUpload?: () => void;
  onReuploadMaterial?: () => void;
  onReprocessMaterial?: () => boolean | void;
  reprocessingMaterial?: boolean;
  onQuizAttempt?: (concept: string, correct: boolean, confidence: number, stepKey?: string) => void;
  onLeitnerRate?: (concept: string, rating: FsrsRating) => void;
  onLogStudyMinutes?: (minutes: number, label?: string) => void;
  onStartTask?: (taskId: string) => void;
  tasks?: Task[];
  userSettings?: UserSettings;
  openSourceAt?: (highlight: SourceHighlight) => void;
  clearSourceHighlight?: () => void;
  sourceHighlight?: SourceHighlight | null;
  workspaceFocus?: WorkspaceFocus | null;
  setWorkspaceFocus?: (f: WorkspaceFocus | null) => void;
  onConceptBusDirty?: () => void;
  onWorkspaceLiveSync?: (live: WorkspaceLiveSync) => void;
  agentSplit?: boolean;
  workspaceOpenTool?: WorkspaceToolId | null;
  onConsumeWorkspaceOpenTool?: () => void;
}

export const AVAILABLE_TOOLS: WorkspaceTool[] = [
  'reader', 'concept-map', 'scratchpad', 'whiteboard', 'leitner',
  'feynman', 'quiz', 'simulator', 'compare', 'debate', 'timer', 'annotations', 'dashboard'
];
`;

const hookImports = importLines.join('\n').replace(
  /from '\.\.\/\.\.\//g,
  "from '../../../",
);

const hookBody = lines.slice(hookBodyStart, returnStart).join('\n');

const hookContent = `${hookImports}
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { CommandItem } from '../CommandPalette';
import type { MobileIntelTab } from '../WorkspaceMobileIntelligenceTabs';
import {
  AVAILABLE_TOOLS,
  type LayoutMode,
  type StudyWorkspaceProps,
  type WorkspaceTool,
} from './types';

export function useStudyWorkspace({
  onClose,
  onOpenAgent,
  onOpenAgentWithPrompt,
  onComplete,
  taskTitle,
  courseName,
  quizConcept = 'Economics',
  initialTool = 'reader',
  taskId,
  learnerModel,
  dashboardStats = { streak: 0, reviewsDue: 0, studyTimeToday: 0, studyTimeWeek: 0 },
  conceptBars = [],
  uploadedFiles = [],
  glossaryEntries = [],
  courses = [],
  courseId,
  onUpload,
  onReuploadMaterial,
  onReprocessMaterial,
  reprocessingMaterial = false,
  onQuizAttempt,
  onLeitnerRate,
  onLogStudyMinutes,
  onStartTask,
  tasks = [],
  userSettings,
  openSourceAt,
  sourceHighlight,
  workspaceFocus = {},
  setWorkspaceFocus,
  onConceptBusDirty,
  onWorkspaceLiveSync,
  agentSplit = false,
  workspaceOpenTool = null,
  onConsumeWorkspaceOpenTool,
}: StudyWorkspaceProps) {
${hookBody}
  return {
    // props passthrough
    onClose,
    onOpenAgent,
    onComplete,
    taskTitle,
    courseName,
    quizConcept,
    taskId,
    onUpload,
    onReprocessMaterial,
    reprocessingMaterial,
    onQuizAttempt,
    onLeitnerRate,
    onLogStudyMinutes,
    onStartTask,
    tasks,
    userSettings,
    agentSplit,
    t,
    lang,
    progressKey,
    activeTool,
    isMobile,
    layout,
    setLayout,
    currentStep,
    setCurrentStep,
    quizPassed,
    setQuizPassed,
    genStatus,
    lessonCollapsed,
    setLessonCollapsed,
    chromeHidden,
    showPalette,
    setShowPalette,
    showShortcutHelp,
    setShowShortcutHelp,
    showNotes,
    setShowNotes,
    notes,
    setNotes,
    scratchpadImport,
    setScratchpadImport,
    customLeitnerCards,
    setCustomLeitnerCards,
    sharedAnnotations,
    annotationSyncLive,
    annotationSyncMode,
    quizIrtRevision,
    setQuizIrtRevision,
    pendingExamPractice,
    setPendingExamPractice,
    intelTab,
    setIntelTab,
    intelSheetOpen,
    setIntelSheetOpen,
    conceptLensExpanded,
    setConceptLensExpanded,
    stepMarks,
    setStepMarks,
    mobileToolDrawerOpen,
    setMobileToolDrawerOpen,
    reprocessWizardOpen,
    setReprocessWizardOpen,
    reprocessApplied,
    conceptBus,
    effectiveFocus,
    noteBundle,
    sourceIntelligence,
    toolEmptyMessage,
    handleToolUpload,
    linkedCourse,
    effectiveCourseId,
    handleReuploadMaterial,
    sourceQualityScore,
    showReuploadHint,
    showLowQualityBanner,
    sourceTextHygiene,
    noteConceptActivity,
    openReprocessWizard,
    reprocessPreview,
    handleApplyReprocess,
    scopedGlossary,
    conceptMastery,
    conceptBusInsights,
    conceptBusRows,
    weakAreaSpots,
    spacedStepsDue,
    quizIrtState,
    readerText,
    readerOcrRegions,
    focusOnTerm,
    openReaderForTerm,
    sendScratchpadToWhiteboard,
    openWorkspaceTool,
    openReaderAtSearch,
    handlePublishAnnotation,
    timerExamTarget,
    workspaceDaysToExam,
    pullSharedAnnotations,
    STEPS,
    dueStepIndices,
    leitnerSession,
    leitnerDueCount,
    readerStepToSegmentIndex,
    readerStepSegmentIndex,
    readerHeatSyncReport,
    readerActiveStepSync,
    readerStepHeatLevels,
    selectWorkspaceStep,
    handleReaderSectionNavSelect,
    buildFullAgentContext,
    handleOpenAgent,
    openAgentForSection,
    openAgentForTool,
    handleSectionStudy,
    handleSectionAskAgent,
    handleWorkspaceSelectionAction,
    handleQuizRemediateWrong,
    handleCrossLinkAgent,
    handleCrossLinkReader,
    focusWeakArea,
    workspaceCorrelation,
    quizDef,
    quizIrtDisplay,
    quizSession,
    quizSessionIrt,
    discoverabilityActions,
    conceptMapCursorSync,
    conceptNodes,
    conceptEdges,
    workspaceContext,
    paletteItems,
    nextActionRecommendation,
    discoverabilitySummary,
    handleLearningAction,
    runNextAction,
    feynmanSession,
    compareSession,
    debateSession,
    simulatorSession,
    whiteboardSession,
    timerSession,
    dashboardSession,
    dashboardMiniProps,
    activeConceptLabel,
    conceptLensView,
    openReaderAtConceptSection,
    handleConceptBusRemediation,
    handleConceptLensAction,
    handleStepNext,
    quizArtifactStale,
    leitnerArtifactStale,
    simulatorArtifactStale,
    acknowledgePracticeStale,
  };
}

export type StudyWorkspaceModel = ReturnType<typeof useStudyWorkspace>;
`;

const outDir = path.join(root, 'studyWorkspace');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'types.ts'), typesContent);
fs.writeFileSync(path.join(outDir, 'useStudyWorkspace.ts'), hookContent);

console.log('Wrote types.ts and useStudyWorkspace.ts');
console.log('Hook body lines:', returnStart - hookBodyStart);
