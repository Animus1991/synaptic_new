import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  X, Maximize2, Minimize2, ChevronRight, Sparkles, PanelLeftClose, PanelLeftOpen, StickyNote,
  LayoutGrid, AlertTriangle,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { WorkspaceDock } from './WorkspaceDock';
import { WorkspaceMobileToolDrawer } from './WorkspaceMobileToolDrawer';
import { WorkspaceToolHeader } from './WorkspaceToolHeader';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import { fallbackWorkspaceSteps } from '../../lib/noteContentExtractors';
import { SourceIntelligenceCard } from './SourceIntelligenceCard';
import { LessonContent } from './LessonContent';
import { DraggableConceptMap } from './DraggableConceptMap';
import { AnnotationOverlay } from './AnnotationOverlay';
import { FormulaScratchpad } from './FormulaScratchpad';
import { DashboardPanel } from './DashboardPanel';
import { LeitnerPanel } from './LeitnerPanel';
import { TimerPanel } from './TimerPanel';
import { SimulatorPanel } from './SimulatorPanel';
import { DebatePanel } from './DebatePanel';
import { CognitiveReader } from './CognitiveReader';
import { WhiteboardPanel } from './WhiteboardPanel';
import { FeynmanCheck } from './FeynmanCheck';
import { ComparePanel } from './ComparePanel';
import { QuizPanel } from './QuizPanel';
import { CommandPalette, type CommandItem } from './CommandPalette';
import { buildWorkspaceNoteBundle } from '../../lib/workspaceNoteContent';
import {
  workspaceEmptyUploadHandler,
  workspaceToolEmptyMessage,
  type WorkspaceEmptyTool,
} from '../../lib/workspaceEmptyState';
import { loadWorkspaceStep, saveWorkspaceStep, saveConceptMapPositions, loadConceptMapPositions, loadWorkspaceNotes, saveWorkspaceNotes, loadConceptBus, saveConceptBus, loadAllConceptBuses } from '../../lib/workspacePersistence';
import { buildMiniDashboardProps } from '../../lib/workspaceData';
import { collectConceptBusInsights, countSpacedStepReviewsDue, type ConceptBusMap } from '../../lib/conceptBusSync';
import { loadAllStepSchedules } from '../../lib/spacedStepSchedule';
import { useI18n } from '../../lib/i18n';
import type { Course, GlossaryEntry, LearnerModel, Task, UploadedFile, UserSettings } from '../../types';
import type { FsrsRating } from '../../lib/pedagogy';
import { findConceptSpan, resolveReaderText, type SourceHighlight } from '../../lib/conceptProvenance';
import { findTextSpanInFiles } from '../../lib/findTextSpanInSource';
import { mergeReaderHighlight, type WorkspaceFocus } from '../../lib/workspaceFocus';
import {
  activityFor,
  type ConceptBusState,
  type ConceptSignal,
  normalizeConceptBusState,
} from '../../lib/workspaceConceptBus';
import type { ScratchpadExport } from '../../lib/workspaceScratchpadBridge';
import {
  buildWorkspaceCorrelation,
  orderStepsByMastery,
  resolveConceptMastery,
} from '../../lib/workspaceCorrelation';
import {
  applySpacedStepBoost,
  loadStepSchedule,
  recordStepVisit,
} from '../../lib/spacedStepSchedule';
import {
  broadcastAnnotationSync,
  connectAnnotationStream,
  DEFAULT_ANNOTATION_POLL_MS,
  mergeSharedAnnotations,
  type AnnotationSyncMode,
} from '../../lib/annotationRealtimeSync';
import { orderDeckByDueQueue } from '../../lib/leitnerDeckSync';
import { loadExamTarget, saveExamPracticePreset, saveLastSimulatorScenario } from '../../lib/workspacePersistence';
import { daysUntilExam, type ExamPracticePresetId, type SimulatorScenarioId, examPracticePresetForScenario } from '../../lib/examPracticePresets';
import { buildAdaptiveQuizFromNotes } from '../../lib/noteContentExtractors';
import {
  buildQuizIrtDisplay,
  loadQuizIrt,
  recordQuizResponse,
  targetQuizDifficulty,
} from '../../lib/quizIrt';
import { buildDiscoverabilitySummary } from '../../lib/workspaceDiscoverability';
import {
  acknowledgeStaleTool,
  isToolArtifactStale,
  type StalePracticeTool,
} from '../../lib/artifactStaleness';
import {
  buildSelectionAgentPrompt,
  buildSelectionFlashcard,
  type WorkspaceSelectionActionId,
  type WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';
import { buildReaderSegments } from '../../lib/readerDocumentLayout';
import { shouldShowCourseQualityBanner } from '../../lib/courseQualityBanner';
import { buildReprocessPreview } from '../../lib/reprocessPreview';
import { ReprocessPreviewModal } from '../ReprocessPreviewModal';
import { isLowSourceQuality } from '../../lib/sourceQualityPrompt';
import {
  isWorkspaceQuizStep,
  resolveWorkspaceStepForReaderLabel,
} from '../../lib/readerStepSync';
import {
  isReaderNavNoop,
  resolveReaderNavToStep,
  resolveStepAfterReprocess,
  buildStepToSegmentMap,
  resolveStepToReaderSegment,
} from '../../lib/readerStepSyncBridge';
import {
  auditReaderHeatmapStepSync,
  activeStepHeatSyncSummary,
  stepHeatDotClass,
} from '../../lib/readerHeatmapStepSyncQA';
import type { ReaderHeatmapLevel } from '../../lib/readerLearningHeatmap';
import {
  buildWeakAreaWorkspaceFocus,
  resolveWorkspaceStepForConcept,
} from '../../lib/workspaceWeakAreas';
import { buildQuizSessionContent } from '../../lib/quizSessionModel';
import type { QuizSessionItem } from '../../lib/quizSession';
import {
  loadQuizDesiredCount,
  saveQuizDesiredCount,
  DEFAULT_QUIZ_COUNT,
  QUIZ_COUNT_OPTIONS,
} from '../../lib/quizSession';
import {
  buildQuizMistakeFlashcard,
  buildQuizMistakeFeynmanPrompt,
} from '../../lib/quizRemediation';
import { buildCompareDifferencePrompt } from '../../lib/compareExplainDifference';
import { conceptSignalForAnnotationCategory } from '../../lib/annotationAnchor';
import { appendScratchpadAnnotation } from '../../lib/scratchpadEntryStore';
import { appendCustomLeitnerCard, loadCustomLeitnerCards } from '../../lib/leitnerCustomCards';
import {
  buildAgentPromptForSection,
  type LearningActionId,
} from '../../lib/workspaceLearningActions';
import type { AgentMode } from '../../types';
import { WorkspaceDiscoverabilityPanel } from './WorkspaceDiscoverabilityPanel';
import { ConceptBusPanel } from './ConceptBusPanel';
import { ConceptLensPanel } from './ConceptLensPanel';
import { WeakAreasFocusRail } from './WeakAreasFocusRail';
import { WorkspaceMobileIntelligenceTabs, intelPanelId, type MobileIntelTab } from './WorkspaceMobileIntelligenceTabs';
import { crossLinkAgentPrompt } from './WorkspaceToolCrossLinkBar';
import type { OpenAgentFromWorkspaceOpts } from '../../lib/agentWorkspaceContext';
import { buildAgentWorkspaceContext } from '../../lib/agentWorkspaceContext';
import { nextActionLabel } from '../../lib/nextActionEngine';
import {
  selectNextBestAction,
  selectWeakConcepts,
  selectWorkspaceContext,
} from '../../lib/workspaceSelectors';
import { createWorkspaceLiveSync, type WorkspaceLiveSync } from '../../lib/workspaceStoreSpine';
import { defaultEventConfidence } from '../../lib/workspaceCorrelationEvents';
import { emitWorkspaceConceptEvent } from '../../lib/emitLearningEvent';
import { buildConceptBusRows, buildToolActivityBreakdown } from '../../lib/conceptBusPanelModel';
import type { ConceptRemediationId } from '../../lib/conceptBusRemediation';
import { enrichWeakSpotsWithReasons } from '../../lib/weakAreaReasons';
import { buildDashboardWeakSpots } from '../../lib/dashboardWeakSpotsModel';
import {
  buildAnnotationAgentPrompt,
  buildCompareToolAgentPrompt,
  buildDebateClaimAgentPrompt,
  buildFeynmanToolAgentPrompt,
  buildFormulaAgentPrompt,
  buildScratchpadNoteAgentPrompt,
  buildSectionAskAgentPrompt,
  buildToolDefaultAgentPrompt,
  resolveToolAgentMode,
  type ToolAgentIntent,
} from '../../lib/workspaceToolAgentPrompts';
import { buildConceptLensView, type ConceptLensAction } from '../../lib/conceptGraphModel';
import { buildFeynmanSessionContent } from '../../lib/feynmanSessionModel';
import { loadFeynmanDraft } from '../../lib/feynmanDraftStore';
import { buildCompareSessionContent } from '../../lib/compareSessionModel';
import { buildDebateSessionContent } from '../../lib/debateSessionModel';
import { buildLeitnerSessionContent } from '../../lib/leitnerSessionModel';
import { buildSimulatorSessionContent } from '../../lib/simulatorSessionModel';
import { buildWhiteboardSessionContent } from '../../lib/whiteboardSessionModel';
import { buildTimerSessionContent } from '../../lib/timerSessionModel';
import { buildDashboardSessionContent } from '../../lib/dashboardSessionModel';
import { displayWorkspaceStepTitle } from '../../lib/workspaceContextModel';
import { WorkspaceSourceStatusBar } from './WorkspaceSourceStatusBar';
import {
  fetchSharedAnnotations,
  publishTeacherAnnotation,
  isProxyConfigured,
  configuredProxyBase,
  type SharedAnnotationDto,
} from '../../lib/authClient';
import type { StoredAnnotation } from '../../lib/annotationStore';

type WorkspaceTool = WorkspaceToolId;
type LayoutMode = 'split' | 'focus-lesson' | 'focus-tool' | 'zen';

interface Props {
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
  /** §2.1 — push live workspace context to global store for Agent + Dashboard. */
  onWorkspaceLiveSync?: (live: WorkspaceLiveSync) => void;
  /** Split-view with Agent panel (58% width). */
  agentSplit?: boolean;
  workspaceOpenTool?: import('../../lib/taskFlows').WorkspaceToolId | null;
  onConsumeWorkspaceOpenTool?: () => void;
}

const AVAILABLE_TOOLS: WorkspaceTool[] = [
  'reader', 'concept-map', 'scratchpad', 'whiteboard', 'leitner',
  'feynman', 'quiz', 'simulator', 'compare', 'debate', 'timer', 'annotations', 'dashboard'
];

export function StudyWorkspace({
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
}: Props) {
  const { t, lang } = useI18n();
  const progressKey = taskId ? `task:${taskId}` : `concept:${quizConcept}`;

  const [activeTool, setActiveTool] = useState<WorkspaceTool>(initialTool);
  const [layout, setLayout] = useState<LayoutMode>('split');
  const [isMobile, setIsMobile] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => loadWorkspaceStep(progressKey));
  const [quizPassed, setQuizPassed] = useState(false);
  const [genStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const [lessonCollapsed, setLessonCollapsed] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(() => loadWorkspaceNotes(progressKey));
  const [scratchpadImport, setScratchpadImport] = useState<ScratchpadExport | null>(null);
  const [customLeitnerCards, setCustomLeitnerCards] = useState(() => loadCustomLeitnerCards(progressKey));

  useEffect(() => {
    setCustomLeitnerCards(loadCustomLeitnerCards(progressKey));
  }, [progressKey]);

  useEffect(() => {
    if (!workspaceOpenTool) return;
    setActiveTool(workspaceOpenTool);
    onConsumeWorkspaceOpenTool?.();
  }, [workspaceOpenTool, onConsumeWorkspaceOpenTool]);
  const [sharedAnnotations, setSharedAnnotations] = useState<SharedAnnotationDto[]>([]);
  const [annotationSyncVersion, setAnnotationSyncVersion] = useState(0);
  const [annotationSyncLive, setAnnotationSyncLive] = useState(false);
  const [annotationSyncMode, setAnnotationSyncMode] = useState<AnnotationSyncMode>('poll');
  const [quizIrtRevision, setQuizIrtRevision] = useState(0);
  const [sandboxTopSensitivityCue, setSandboxTopSensitivityCue] = useState<string | undefined>();
  const [pendingExamPractice, setPendingExamPractice] = useState<ExamPracticePresetId | null>(null);
  /** Single open intelligence panel (tabs on all breakpoints). null = collapsed. */
  const [intelTab, setIntelTab] = useState<MobileIntelTab | null>(null);
  const [conceptLensExpanded, setConceptLensExpanded] = useState(false);
  const [sourceIntelExpanded, setSourceIntelExpanded] = useState(false);
  const [stepMarks, setStepMarks] = useState<Record<number, 'understood' | 'confusing'>>({});
  const [mobileToolDrawerOpen, setMobileToolDrawerOpen] = useState(false);
  const [localFocus, setLocalFocus] = useState<WorkspaceFocus>({});
  const [reprocessWizardOpen, setReprocessWizardOpen] = useState(false);
  const [reprocessApplied, setReprocessApplied] = useState(false);
  
  const lastAnnotationSyncRef = useRef<string | null>(null);
  const annotationBackendDownRef = useRef(false);
  const conceptBusSyncInit = useRef(true);

  const [conceptBus, setConceptBus] = useState<ConceptBusState>(
    () => normalizeConceptBusState(loadConceptBus<ConceptBusState>(progressKey) ?? {}),
  );

  // Persist cross-tool concept engagement so interconnection survives sessions.
  useEffect(() => {
    saveConceptBus(progressKey, conceptBus);
  }, [progressKey, conceptBus]);

  useEffect(() => {
    if (conceptBusSyncInit.current) {
      conceptBusSyncInit.current = false;
      return;
    }
    onConceptBusDirty?.();
  }, [conceptBus, onConceptBusDirty]);

  const sectionTitleRef = useRef<string | undefined>(undefined);

  const effectiveFocus = useMemo(() => {
    if (workspaceFocus?.term) return workspaceFocus;
    return localFocus.term ? localFocus : workspaceFocus ?? {};
  }, [workspaceFocus, localFocus]);

  const noteBundle = useMemo(
    () => buildWorkspaceNoteBundle({
      uploadedFiles,
      glossaryEntries,
      courses,
      courseId,
      concept: quizConcept,
      conceptBars,
      lang,
      learnerModel,
    }),
    [uploadedFiles, glossaryEntries, courses, courseId, quizConcept, conceptBars, lang, learnerModel],
  );
  const sourceIntelligence = noteBundle.sourceIntelligence;

  const toolEmptyMessage = useCallback(
    (tool: WorkspaceEmptyTool) =>
      workspaceToolEmptyMessage({
        tool,
        hasSource: noteBundle.hasSource,
        lang,
        concept: quizConcept,
      }),
    [noteBundle.hasSource, lang, quizConcept],
  );
  const handleToolUpload = workspaceEmptyUploadHandler(noteBundle.hasSource, onUpload);

  const linkedCourse = useMemo(
    () => courses.find((c) => c.id === (courseId ?? uploadedFiles.find((f) => f.courseId)?.courseId)),
    [courses, courseId, uploadedFiles],
  );
  const effectiveCourseId = courseId ?? linkedCourse?.id ?? uploadedFiles.find((f) => f.courseId)?.courseId;
  const [artifactStaleRevision, setArtifactStaleRevision] = useState(0);
  const acknowledgePracticeStale = useCallback((tool: StalePracticeTool) => {
    if (!effectiveCourseId) return;
    acknowledgeStaleTool(effectiveCourseId, tool);
    setArtifactStaleRevision((n) => n + 1);
  }, [effectiveCourseId]);
  const quizArtifactStale = useMemo(
    () => isToolArtifactStale(effectiveCourseId, 'quiz'),
    [effectiveCourseId, artifactStaleRevision],
  );
  const leitnerArtifactStale = useMemo(
    () => isToolArtifactStale(effectiveCourseId, 'leitner'),
    [effectiveCourseId, artifactStaleRevision],
  );
  const simulatorArtifactStale = useMemo(
    () => isToolArtifactStale(effectiveCourseId, 'simulator'),
    [effectiveCourseId, artifactStaleRevision],
  );
  const prevReprocessingRef = useRef(reprocessingMaterial);
  useEffect(() => {
    if (prevReprocessingRef.current && !reprocessingMaterial) {
      setArtifactStaleRevision((n) => n + 1);
    }
    prevReprocessingRef.current = reprocessingMaterial;
  }, [reprocessingMaterial]);
  const handleReuploadMaterial = onReuploadMaterial ?? onUpload;
  const qualityBannerDecision = useMemo(() => {
    if (linkedCourse) {
      return shouldShowCourseQualityBanner({
        course: linkedCourse,
        uploadedFiles,
        hasReuploadHandler: Boolean(handleReuploadMaterial),
      });
    }
    const score = sourceIntelligence?.score ?? null;
    return {
      show: noteBundle.hasSource && isLowSourceQuality(score),
      score: typeof score === 'number' ? score : null,
      showMigrationBanner: false,
    };
  }, [linkedCourse, uploadedFiles, handleReuploadMaterial, noteBundle.hasSource, sourceIntelligence?.score]);
  const showReuploadHint = Boolean(
    qualityBannerDecision.showMigrationBanner && effectiveCourseId && handleReuploadMaterial,
  );
  const sourceQualityScore = qualityBannerDecision.score
    ?? linkedCourse?.sourceQuality?.score
    ?? sourceIntelligence?.score;
  const showLowQualityBanner = qualityBannerDecision.show;

  /** Report a real cross-tool concept interaction via unified learning event path (§2.2). */
  const noteConceptActivity = useCallback(
    (concept: string | undefined, tool: WorkspaceTool, signal: ConceptSignal) => {
      const label = concept?.trim();
      if (!label) return;

      setConceptBus((prev) => {
        const result = emitWorkspaceConceptEvent(
          {
            conceptId: label,
            tool,
            signal,
            confidence: defaultEventConfidence(sourceQualityScore ?? null),
            sectionId: sectionTitleRef.current,
            courseId: effectiveCourseId,
          },
          prev,
        );
        return result.conceptBus;
      });
    },
    [sourceQualityScore, effectiveCourseId],
  );

  const internalSetFocus = useCallback((f: WorkspaceFocus) => {
    setLocalFocus((prev) => ({ ...prev, ...f }));
    setWorkspaceFocus?.(f);
    if (f.term && f.originTool) {
      noteConceptActivity(f.term, f.originTool as WorkspaceTool, 'focus');
    }
  }, [setWorkspaceFocus, noteConceptActivity]);

  const openReprocessWizard = useCallback(() => {
    setReprocessApplied(false);
    setReprocessWizardOpen(true);
  }, []);

  const reprocessPreview = useMemo(() => {
    if (!reprocessWizardOpen || !linkedCourse) return null;
    return buildReprocessPreview(linkedCourse, uploadedFiles, lang, quizConcept);
  }, [reprocessWizardOpen, linkedCourse, uploadedFiles, lang, quizConcept]);

  const handleApplyReprocess = useCallback(() => {
    if (!onReprocessMaterial) return;
    const ok = onReprocessMaterial();
    if (ok !== false) setReprocessApplied(true);
  }, [onReprocessMaterial]);

  const scopedGlossary = useMemo(
    () => (effectiveCourseId
      ? glossaryEntries.filter((g) => g.courseId === effectiveCourseId)
      : glossaryEntries),
    [glossaryEntries, effectiveCourseId],
  );

  const conceptMastery = useMemo(
    () => resolveConceptMastery(quizConcept, conceptBars, noteBundle.matchingTopic?.mastery),
    [quizConcept, conceptBars, noteBundle.matchingTopic?.mastery],
  );

  const conceptBusInsights = useMemo(() => {
    const all: ConceptBusMap = { ...(loadAllConceptBuses() as ConceptBusMap), [progressKey]: conceptBus };
    return collectConceptBusInsights(all, (c) => resolveConceptMastery(c, conceptBars));
  }, [conceptBus, progressKey, conceptBars]);

  const conceptBusRows = useMemo(
    () => buildConceptBusRows(conceptBus, effectiveFocus?.term ?? quizConcept),
    [conceptBus, effectiveFocus?.term, quizConcept],
  );

  const weakAreaSpots = useMemo(
    () => enrichWeakSpotsWithReasons(
      selectWeakConcepts(learnerModel, conceptBusInsights, conceptBus, courseName),
      conceptBus,
      lang,
    ),
    [learnerModel, conceptBusInsights, conceptBus, courseName, lang],
  );

  const spacedStepsDue = useMemo(
    () => countSpacedStepReviewsDue(loadAllStepSchedules()),
    [currentStep, progressKey],
  );

  const quizIrtState = useMemo(
    () => loadQuizIrt(progressKey),
    [progressKey, quizIrtRevision],
  );

  const readerText = useMemo(
    () => resolveReaderText(uploadedFiles, sourceHighlight, noteBundle.readerText),
    [uploadedFiles, sourceHighlight, noteBundle.readerText],
  );

  const readerOcrRegions = useMemo(
    () => uploadedFiles
      .filter((f) => f.courseId === effectiveCourseId && (f.ocrRegions?.length ?? 0) > 0)
      .flatMap((f) => f.ocrRegions ?? []),
    [uploadedFiles, effectiveCourseId],
  );

  const focusOnTerm = useCallback((term: string, origin?: WorkspaceTool) => {
    internalSetFocus({ term, originTool: origin });
  }, [internalSetFocus]);

  const openReaderForTerm = useCallback((term: string, origin?: WorkspaceTool) => {
    focusOnTerm(term, origin);
    setActiveTool('reader');
    if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
  }, [focusOnTerm, layout, isMobile]);

  const sendScratchpadToWhiteboard = useCallback((payload: ScratchpadExport) => {
    setScratchpadImport(payload);
    noteConceptActivity(quizConcept, 'scratchpad', 'noted');
    setActiveTool('whiteboard');
    if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
  }, [layout, isMobile, noteConceptActivity, quizConcept]);

  const openWorkspaceTool = useCallback((tool: WorkspaceTool) => {
    setActiveTool(tool);
    if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
  }, [layout, isMobile]);

  const openReaderAtSearch = useCallback((query: string, origin?: WorkspaceTool) => {
    const courseSpan = linkedCourse ? findConceptSpan(linkedCourse, query) : undefined;
    const fileSpan = findTextSpanInFiles(uploadedFiles, query);
    const highlight: SourceHighlight | null = courseSpan
      ? { fileId: courseSpan.fileId, charStart: courseSpan.charStart, charEnd: courseSpan.charEnd }
      : fileSpan
        ? { fileId: fileSpan.fileId, charStart: fileSpan.charStart, charEnd: fileSpan.charEnd }
        : null;
    internalSetFocus({
      term: query,
      highlight,
      originTool: origin,
    });
    if (highlight) openSourceAt?.(highlight);
    setActiveTool('reader');
    if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
  }, [linkedCourse, uploadedFiles, openSourceAt, layout, isMobile, internalSetFocus]);

  const handlePublishAnnotation = useCallback(async (ann: StoredAnnotation) => {
    const token = userSettings?.authToken;
    if (!token || !userSettings || !effectiveCourseId || !noteBundle.fileKey || noteBundle.fileKey === 'no-source') return;
    const saved = await publishTeacherAnnotation(token, userSettings, {
      courseId: effectiveCourseId,
      fileKey: noteBundle.fileKey,
      type: ann.type,
      text: ann.text,
      color: ann.color,
      lineStart: ann.lineStart,
      lineEnd: ann.lineEnd,
      focusTerm: ann.focusTerm,
    });
    if (saved) {
      setSharedAnnotations((prev) => mergeSharedAnnotations(prev, [saved]));
      broadcastAnnotationSync({
        courseId: effectiveCourseId,
        fileKey: noteBundle.fileKey,
        version: annotationSyncVersion + 1,
        at: new Date().toISOString(),
      });
    }
  }, [userSettings, effectiveCourseId, noteBundle.fileKey, annotationSyncVersion]);

  const timerExamTarget = useMemo(
    () => loadExamTarget(progressKey),
    [progressKey],
  );
  const workspaceDaysToExam = useMemo(
    () => daysUntilExam(timerExamTarget),
    [timerExamTarget],
  );

  const annotationSyncEnabled = useMemo(
    () => isProxyConfigured(userSettings)
      && Boolean(effectiveCourseId)
      && noteBundle.fileKey !== 'no-source',
    [userSettings, effectiveCourseId, noteBundle.fileKey],
  );

  const pullSharedAnnotations = useCallback(async (since?: string) => {
    if (!annotationSyncEnabled || !userSettings || !effectiveCourseId || !noteBundle.fileKey) {
      setSharedAnnotations([]);
      setAnnotationSyncLive(false);
      setAnnotationSyncMode('off');
      return;
    }
    if (annotationBackendDownRef.current && since) return;

    const result = await fetchSharedAnnotations(userSettings, effectiveCourseId, noteBundle.fileKey, { since });
    if (!result.reachable) {
      annotationBackendDownRef.current = true;
      setAnnotationSyncLive(false);
      setAnnotationSyncMode('off');
      return;
    }
    annotationBackendDownRef.current = false;
    if (since && result.annotations.length > 0) {
      setSharedAnnotations((prev) => mergeSharedAnnotations(prev, result.annotations));
    } else if (!since) {
      setSharedAnnotations(result.annotations);
    }
    setAnnotationSyncVersion(result.version);
    lastAnnotationSyncRef.current = result.serverTime;
    setAnnotationSyncLive(true);
  }, [annotationSyncEnabled, userSettings, effectiveCourseId, noteBundle.fileKey]);

  useEffect(() => {
    if (!annotationSyncEnabled) {
      setSharedAnnotations([]);
      setAnnotationSyncLive(false);
      setAnnotationSyncMode('off');
      annotationBackendDownRef.current = false;
      return;
    }
    annotationBackendDownRef.current = false;
    void pullSharedAnnotations();
  }, [annotationSyncEnabled, pullSharedAnnotations]);

  useEffect(() => {
    const base = configuredProxyBase(userSettings ?? undefined);
    if (!base || !annotationSyncEnabled || !effectiveCourseId || !noteBundle.fileKey) return;
    const disconnect = connectAnnotationStream(
      base,
      effectiveCourseId,
      noteBundle.fileKey,
      (payload) => {
        annotationBackendDownRef.current = false;
        if (payload.annotations.length > 0) {
          setSharedAnnotations((prev) => mergeSharedAnnotations(prev, payload.annotations));
        } else {
          setSharedAnnotations(payload.annotations);
        }
        setAnnotationSyncVersion(payload.version);
        lastAnnotationSyncRef.current = payload.serverTime;
        setAnnotationSyncLive(true);
      },
      setAnnotationSyncMode,
    );
    return disconnect;
  }, [annotationSyncEnabled, userSettings, effectiveCourseId, noteBundle.fileKey]);

  useEffect(() => {
    if (annotationSyncMode !== 'poll') return;
    if (!annotationSyncEnabled || annotationBackendDownRef.current) return;
    const id = window.setInterval(() => {
      void pullSharedAnnotations(lastAnnotationSyncRef.current ?? undefined);
    }, DEFAULT_ANNOTATION_POLL_MS);
    return () => window.clearInterval(id);
  }, [annotationSyncMode, annotationSyncEnabled, pullSharedAnnotations]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined' || !effectiveCourseId) return;
    const ch = new BroadcastChannel('synapse.annotation.sync');
    ch.onmessage = (ev: MessageEvent<{ courseId?: string; fileKey?: string }>) => {
      if (ev.data?.courseId === effectiveCourseId && ev.data?.fileKey === noteBundle.fileKey) {
        void pullSharedAnnotations(lastAnnotationSyncRef.current ?? undefined);
      }
    };
    return () => ch.close();
  }, [effectiveCourseId, noteBundle.fileKey, pullSharedAnnotations]);

  useEffect(() => {
    if (!sourceHighlight) return;
    setActiveTool('reader');
    if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
  }, [sourceHighlight, layout, isMobile]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const rawSteps = useMemo(() => {
    if (!noteBundle.hasSource) {
      return [{
        title: lang === 'el' ? 'Ανέβασμα σημειώσεων' : 'Upload your notes',
        type: lang === 'el' ? 'Αρχική' : 'Intro',
      }];
    }
    const steps = noteBundle.workspaceSteps ?? [];
    return steps.length > 0 ? [...steps] : fallbackWorkspaceSteps(quizConcept, lang);
  }, [noteBundle.hasSource, noteBundle.workspaceSteps, quizConcept, lang]);

  const masteryOrderedSteps = useMemo(() => {
    if (!noteBundle.hasSource || rawSteps.length <= 2) return rawSteps;
    return orderStepsByMastery(rawSteps, quizConcept, conceptMastery, conceptBars);
  }, [rawSteps, noteBundle.hasSource, quizConcept, conceptMastery, conceptBars]);

  const stepSchedule = useMemo(() => loadStepSchedule(progressKey), [progressKey]);

  const { steps: STEPS, dueIndices: dueStepIndices } = useMemo(() => {
    if (!noteBundle.hasSource || masteryOrderedSteps.length <= 2) {
      return { steps: masteryOrderedSteps, dueIndices: [] as number[] };
    }
    return applySpacedStepBoost(masteryOrderedSteps, stepSchedule);
  }, [masteryOrderedSteps, stepSchedule, noteBundle.hasSource]);

  useEffect(() => {
    sectionTitleRef.current = STEPS[currentStep]?.title;
  }, [STEPS, currentStep]);

  const leitnerSession = useMemo(
    () => buildLeitnerSessionContent({
      text: noteBundle.sourceFullText,
      concept: quizConcept,
      glossary: scopedGlossary,
      lang,
      sectionLabel: STEPS[currentStep]?.title,
      hasSource: noteBundle.hasSource,
      spacingIntervals: learnerModel?.spacingIntervals ?? [],
      customCards: customLeitnerCards,
    }),
    [
      noteBundle.sourceFullText, noteBundle.hasSource, quizConcept, scopedGlossary,
      lang, STEPS, currentStep, learnerModel?.spacingIntervals, customLeitnerCards,
    ],
  );

  const leitnerDueCount = useMemo(() => {
    if (!noteBundle.hasSource || leitnerSession.cards.length === 0) return 0;
    return orderDeckByDueQueue(
      leitnerSession.cards,
      learnerModel?.spacingIntervals ?? [],
      quizConcept,
    ).dueCount;
  }, [leitnerSession.cards, noteBundle.hasSource, learnerModel?.spacingIntervals, quizConcept]);

  const readerStepToSegmentIndex = useMemo(() => {
    const source = noteBundle.sourceFullText?.trim();
    if (!source || !noteBundle.hasSource) return {};
    return buildStepToSegmentMap(STEPS, source);
  }, [noteBundle.sourceFullText, noteBundle.hasSource, STEPS]);

  const readerStepSegmentIndex = useMemo(() => {
    if (readerStepToSegmentIndex[currentStep] != null) return readerStepToSegmentIndex[currentStep]!;
    const source = noteBundle.sourceFullText?.trim();
    if (!source || !noteBundle.hasSource) return null;
    return resolveStepToReaderSegment(currentStep, STEPS, source);
  }, [readerStepToSegmentIndex, currentStep, noteBundle.sourceFullText, noteBundle.hasSource, STEPS]);

  const readerHeatSyncReport = useMemo(
    () => auditReaderHeatmapStepSync({
      steps: STEPS,
      sourceText: noteBundle.sourceFullText ?? '',
      conceptBus,
      primaryConcept: quizConcept,
      stepMarks,
      currentStep,
    }),
    [STEPS, noteBundle.sourceFullText, conceptBus, quizConcept, stepMarks, currentStep],
  );

  const readerActiveStepSync = useMemo(
    () => activeStepHeatSyncSummary(readerHeatSyncReport, currentStep),
    [readerHeatSyncReport, currentStep],
  );

  const readerStepHeatLevels = useMemo(() => {
    const levels: Record<number, ReaderHeatmapLevel> = {};
    for (const row of readerHeatSyncReport.steps) {
      if (row.heatLevel !== 'none') levels[row.stepIndex] = row.heatLevel;
    }
    return levels;
  }, [readerHeatSyncReport]);

  const selectWorkspaceStep = useCallback((i: number, opts?: { focusReader?: boolean }) => {
    setCurrentStep(i);
    const step = STEPS[i];
    if (opts?.focusReader && noteBundle.hasSource && step && !isWorkspaceQuizStep(step)) {
      setActiveTool('reader');
      if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
    }
  }, [STEPS, noteBundle.hasSource, layout, isMobile]);

  const handleReaderSectionNavSelect = useCallback((label: string) => {
    const source = noteBundle.sourceFullText?.trim();
    if (!source) return;
    if (isReaderNavNoop(currentStep, label, STEPS, source)) return;
    const action = resolveReaderNavToStep(label, STEPS, source);
    if (action.type === 'select-step') selectWorkspaceStep(action.stepIndex, { focusReader: true });
  }, [noteBundle.sourceFullText, STEPS, currentStep, selectWorkspaceStep]);

  const buildFullAgentContext = useCallback((stepIndex?: number, sectionLabel?: string) => {
    const idx = stepIndex ?? currentStep;
    const step = STEPS[idx];
    return buildAgentWorkspaceContext({
      courseId: effectiveCourseId,
      courseName,
      stepIndex: idx,
      stepCount: STEPS.length,
      stepTitle: sectionLabel ?? step?.title,
      stepType: step?.type,
      concept: quizConcept,
      activeTool,
      lang,
      sourceQuality: sourceQualityScore ?? null,
      oldPipeline: showReuploadHint,
      pipelineVersion: noteBundle.pipelineVersion,
    });
  }, [
    currentStep, STEPS, effectiveCourseId, courseName, quizConcept, activeTool, lang,
    sourceQualityScore, showReuploadHint, noteBundle.pipelineVersion,
  ]);

  const handleOpenAgent = useCallback(() => {
    const mode = resolveToolAgentMode(activeTool);
    const prompt = buildToolDefaultAgentPrompt(
      activeTool,
      lang,
      quizConcept,
      STEPS[currentStep]?.title,
    );
    if (onOpenAgentWithPrompt) {
      onOpenAgentWithPrompt({
        mode,
        prompt,
        autoSend: false,
        context: buildFullAgentContext(),
      });
    } else {
      onOpenAgent();
    }
  }, [
    onOpenAgentWithPrompt, onOpenAgent, buildFullAgentContext,
    activeTool, lang, quizConcept, STEPS, currentStep,
  ]);

  const openAgentForSection = useCallback((
    sectionLabel: string,
    mode: AgentMode,
    prompt: string,
  ) => {
    const source = noteBundle.sourceFullText?.trim();
    let stepIdx = currentStep;
    if (source) {
      const segments = buildReaderSegments(source);
      const resolved = resolveWorkspaceStepForReaderLabel(sectionLabel, STEPS, segments, source);
      if (resolved != null) stepIdx = resolved;
    }
    if (onOpenAgentWithPrompt) {
      onOpenAgentWithPrompt({
        prompt,
        mode,
        autoSend: true,
        context: buildFullAgentContext(stepIdx, sectionLabel),
      });
    } else {
      onOpenAgent();
    }
  }, [
    noteBundle.sourceFullText, STEPS, currentStep, onOpenAgentWithPrompt, onOpenAgent,
    buildFullAgentContext,
  ]);

  const openAgentForTool = useCallback((
    tool: WorkspaceTool,
    prompt: string,
    intent: ToolAgentIntent = 'default',
    sectionLabel?: string,
  ) => {
    const mode = resolveToolAgentMode(tool, intent);
    openAgentForSection(
      sectionLabel ?? STEPS[currentStep]?.title ?? quizConcept,
      mode,
      prompt,
    );
  }, [openAgentForSection, STEPS, currentStep, quizConcept]);

  const handleSectionStudy = useCallback((label: string) => {
    const source = noteBundle.sourceFullText?.trim();
    if (!source) return;
    const segments = buildReaderSegments(source);
    const stepIdx = resolveWorkspaceStepForReaderLabel(label, STEPS, segments, source);
    if (stepIdx != null) selectWorkspaceStep(stepIdx, { focusReader: true });
  }, [noteBundle.sourceFullText, STEPS, selectWorkspaceStep]);

  const handleSectionAskAgent = useCallback((label: string) => {
    const prompt = buildSectionAskAgentPrompt(label, quizConcept, lang);
    openAgentForTool('reader', prompt, 'section', label);
  }, [lang, quizConcept, openAgentForTool]);

  const handleWorkspaceSelectionAction = useCallback((
    action: WorkspaceSelectionActionId,
    ctx: WorkspaceSelectionContext,
  ) => {
    const term = ctx.term.trim() || quizConcept;
    const excerpt = ctx.text.trim();
    if (!excerpt) return;
    const glossaryDef = scopedGlossary.find((g) =>
      g.term.toLowerCase() === term.toLowerCase()
      || excerpt.toLowerCase().includes(g.term.toLowerCase()),
    )?.definition;

    const emitFocus = (tool: WorkspaceTool, signal: ConceptSignal) => {
      focusOnTerm(term, ctx.originTool);
      noteConceptActivity(term, tool, signal);
    };

    switch (action) {
      case 'annotate':
        openReaderForTerm(term, ctx.originTool);
        break;
      case 'ask-agent': {
        const prompt = buildSelectionAgentPrompt(excerpt, ctx.sectionLabel, term, lang);
        openAgentForTool(
          ctx.originTool,
          prompt,
          'selection',
          ctx.sectionLabel ?? STEPS[currentStep]?.title ?? term,
        );
        noteConceptActivity(term, ctx.originTool, 'read');
        break;
      }
      case 'make-card': {
        const card = buildSelectionFlashcard(excerpt, term, glossaryDef);
        const cardSource =
          ctx.originTool === 'concept-map' ? 'concept-map'
          : ctx.originTool === 'compare' ? 'compare'
          : ctx.originTool === 'debate' ? 'debate'
          : ctx.originTool === 'quiz' ? 'quiz-selection'
          : 'reader-selection';
        setCustomLeitnerCards(appendCustomLeitnerCard(progressKey, {
          ...card,
          source: cardSource,
        }));
        emitFocus('leitner', 'focus');
        openWorkspaceTool('leitner');
        break;
      }
      case 'quiz':
        emitFocus('quiz', 'focus');
        openWorkspaceTool('quiz');
        break;
      case 'compare':
        emitFocus('compare', 'read');
        openWorkspaceTool('compare');
        break;
      case 'debate':
        emitFocus('debate', 'read');
        openWorkspaceTool('debate');
        break;
      case 'scratchpad':
        setNotes((prev) => (prev.trim() ? `${prev.trim()}\n\n— ${excerpt}` : excerpt));
        emitFocus('scratchpad', 'noted');
        openWorkspaceTool('scratchpad');
        break;
      case 'open-reader':
        openReaderAtSearch(excerpt, ctx.originTool);
        break;
    }
  }, [
    quizConcept, scopedGlossary, focusOnTerm, noteConceptActivity, lang, STEPS, currentStep,
    openAgentForTool, progressKey, openWorkspaceTool, openReaderAtSearch, openReaderForTerm,
  ]);

  const handleQuizRemediateWrong = useCallback((
    kind: 'make-card' | 'feynman',
    item: QuizSessionItem,
  ) => {
    noteConceptActivity(quizConcept, 'quiz', 'quiz-wrong');
    if (kind === 'make-card') {
      const card = buildQuizMistakeFlashcard(item, quizConcept);
      setCustomLeitnerCards(appendCustomLeitnerCard(progressKey, {
        ...card,
        source: 'quiz-mistake',
      }));
      openWorkspaceTool('leitner');
      return;
    }
    const prompt = buildQuizMistakeFeynmanPrompt(item, quizConcept, lang);
    openAgentForTool('feynman', prompt, 'quiz-mistake');
    openWorkspaceTool('feynman');
  }, [
    quizConcept, noteConceptActivity, progressKey, openWorkspaceTool, lang,
    openAgentForTool,
  ]);

  const handleCrossLinkAgent = useCallback(() => {
    const prompt = crossLinkAgentPrompt(activeTool, lang, quizConcept);
    openAgentForTool(activeTool, prompt);
  }, [activeTool, lang, quizConcept, openAgentForTool]);

  const handleCrossLinkReader = useCallback(() => {
    openWorkspaceTool('reader');
    selectWorkspaceStep(currentStep, { focusReader: true });
  }, [openWorkspaceTool, selectWorkspaceStep, currentStep]);

  const focusWeakArea = useCallback((concept: string) => {
    const focus = buildWeakAreaWorkspaceFocus(concept, {
      uploadedFiles,
      course: linkedCourse ?? null,
      courseId: effectiveCourseId,
    });
    internalSetFocus(focus);
    openReaderForTerm(concept, 'reader');
    const source = noteBundle.sourceFullText?.trim();
    const stepIdx = resolveWorkspaceStepForConcept(concept, STEPS, source);
    if (stepIdx != null && stepIdx >= 0) selectWorkspaceStep(stepIdx);
  }, [
    uploadedFiles,
    linkedCourse,
    effectiveCourseId,
    internalSetFocus,
    openReaderForTerm,
    noteBundle.sourceFullText,
    STEPS,
    selectWorkspaceStep,
  ]);

  useEffect(() => {
    if (!workspaceFocus?.term) return;
    setLocalFocus(workspaceFocus);
    setActiveTool('reader');
    const source = noteBundle.sourceFullText?.trim();
    const stepIdx = resolveWorkspaceStepForConcept(workspaceFocus.term, STEPS, source);
    if (stepIdx != null && stepIdx >= 0) setCurrentStep(stepIdx);
  }, [workspaceFocus?.term]); // eslint-disable-line react-hooks/exhaustive-deps -- open-from-dashboard focus

  useEffect(() => {
    saveWorkspaceStep(progressKey, currentStep);
  }, [progressKey, currentStep]);

  const prevStepCountRef = useRef(0);

  useEffect(() => {
    if (STEPS.length === 0) return;
    if (currentStep >= STEPS.length) {
      setCurrentStep(resolveStepAfterReprocess(currentStep, STEPS.length, prevStepCountRef.current || STEPS.length));
    }
    prevStepCountRef.current = STEPS.length;
  }, [STEPS.length, currentStep]);

  useEffect(() => {
    const id = window.setTimeout(() => saveWorkspaceNotes(progressKey, notes), 400);
    return () => window.clearTimeout(id);
  }, [progressKey, notes]);

  const workspaceCorrelation = useMemo(
    () => buildWorkspaceCorrelation({
      progressKey,
      concept: quizConcept,
      conceptMastery,
      courseId: effectiveCourseId,
      focusTerm: effectiveFocus?.term,
      stepIndex: currentStep,
      stepCount: STEPS.length,
      currentStep: STEPS[currentStep],
      glossaryCount: scopedGlossary.length,
      compareRowCount: noteBundle.compareRows.length,
      dueStepIndices,
      annotationSyncVersion,
      leitnerDueCount,
      timerExamTarget: timerExamTarget ?? undefined,
      quizAbility: quizIrtState.ability,
      quizTargetDifficulty: targetQuizDifficulty(quizIrtState.ability, conceptMastery),
      sandboxTopSensitivityCue,
    }),
    [progressKey, quizConcept, conceptMastery, effectiveCourseId, effectiveFocus?.term, currentStep, STEPS, scopedGlossary.length, noteBundle.compareRows.length, dueStepIndices, annotationSyncVersion, leitnerDueCount, timerExamTarget, quizIrtState.ability, sandboxTopSensitivityCue],
  );

  const quizDef = useMemo(() => {
    if (noteBundle.hasSource) {
      const adaptive = buildAdaptiveQuizFromNotes(
        noteBundle.annotationText,
        quizConcept,
        scopedGlossary,
        lang,
        quizIrtState.ability,
        conceptMastery,
      );
      if (adaptive) return adaptive;
      if (noteBundle.quiz) return noteBundle.quiz;
    }
    return {
      question: lang === 'el'
        ? `Ανέβασε σημειώσεις για να δημιουργηθεί κουίζ από το δικό σου υλικό για «${quizConcept}».`
        : `Upload notes to generate a quiz from your material for "${quizConcept}".`,
      options: ['- - -', '- - -', '- - -', '- - -'],
      correctIndex: 0,
    };
  }, [noteBundle.hasSource, noteBundle.annotationText, noteBundle.quiz, quizConcept, scopedGlossary, lang, quizIrtState.ability, conceptMastery]);

  const quizIrtDisplay = useMemo(() => {
    if (!noteBundle.hasSource) return undefined;
    return buildQuizIrtDisplay(quizDef, quizConcept, quizIrtState.ability, conceptMastery);
  }, [noteBundle.hasSource, quizDef, quizConcept, quizIrtState.ability, conceptMastery]);

  const [quizDesiredCount, setQuizDesiredCount] = useState(
    () => loadQuizDesiredCount(progressKey) ?? DEFAULT_QUIZ_COUNT,
  );
  useEffect(() => {
    setQuizDesiredCount(loadQuizDesiredCount(progressKey) ?? DEFAULT_QUIZ_COUNT);
  }, [progressKey]);
  const changeQuizDesiredCount = useCallback((n: number) => {
    setQuizDesiredCount(n);
    saveQuizDesiredCount(progressKey, n);
  }, [progressKey]);

  const quizSession = useMemo(
    () => buildQuizSessionContent({
      text: noteBundle.annotationText,
      concept: quizConcept,
      glossary: scopedGlossary,
      lang,
      ability: quizIrtState.ability,
      mastery: conceptMastery,
      sectionLabel: STEPS[currentStep]?.title,
      hasSource: noteBundle.hasSource,
      count: quizDesiredCount,
    }),
    [
      noteBundle.hasSource, noteBundle.annotationText, quizConcept, scopedGlossary,
      lang, quizIrtState.ability, conceptMastery, STEPS, currentStep, quizDesiredCount,
    ],
  );

  const quizSessionIrt = useMemo(() => {
    const first = quizSession.items[0];
    if (!first || !noteBundle.hasSource) return undefined;
    return buildQuizIrtDisplay(first.quiz, quizConcept, quizIrtState.ability, conceptMastery);
  }, [quizSession.items, noteBundle.hasSource, quizConcept, quizIrtState.ability, conceptMastery]);

  const discoverabilityActions = useMemo(() => ({
    'open-reader-focus': () => openReaderForTerm(effectiveFocus?.term ?? quizConcept, 'reader'),
    'open-leitner-due': () => {
      setActiveTool('leitner');
      if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
    },
    'jump-quiz': () => setCurrentStep(Math.max(0, STEPS.length - 1)),
    'open-compare': () => {
      setActiveTool('compare');
      if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
    },
    'open-command-palette': () => setShowPalette(true),
    'jump-spaced-step': () => {
      const idx = dueStepIndices[0];
      if (idx !== undefined) setCurrentStep(idx);
    },
  }), [effectiveFocus?.term, quizConcept, openReaderForTerm, layout, isMobile, STEPS.length, dueStepIndices]);

  const conceptMapCursorSync = useMemo(() => {
    const base = userSettings?.authProxyBase || userSettings?.llmProxyUrl;
    if (!base || !effectiveCourseId || !quizConcept) return undefined;
    return {
      courseId: effectiveCourseId,
      conceptKey: quizConcept,
      baseUrl: base,
    };
  }, [userSettings, effectiveCourseId, quizConcept]);

  const conceptNodes = useMemo(() => {
    const base = noteBundle.conceptMap.nodes;
    // Restore any positions/notes the learner saved for this scope so a dragged
    // layout survives remounts; falls back to the deterministic seeded arc.
    if (base.length === 0 && quizConcept) {
      return loadConceptMapPositions(
        [{ id: '1', label: quizConcept, type: 'concept' as const, x: 200, y: 150, mastery: 0 }],
        progressKey,
      );
    }
    return loadConceptMapPositions(base, progressKey);
  }, [noteBundle.conceptMap.nodes, quizConcept, progressKey]);

  const conceptEdges = noteBundle.conceptMap.edges;

  const handleConceptMapSave = useCallback(
    (nodes: { id: string; x: number; y: number; note?: string }[]) =>
      saveConceptMapPositions(nodes, progressKey),
    [progressKey],
  );

  const workspaceContext = useMemo(
    () => selectWorkspaceContext({
      courseId: effectiveCourseId,
      courseName: courseName ?? linkedCourse?.title,
      concept: quizConcept,
      stepIndex: currentStep,
      stepCount: STEPS.length,
      stepTitle: STEPS[currentStep]?.title,
      stepType: STEPS[currentStep]?.type,
      activeTool,
      lang,
      sourceQuality: sourceQualityScore ?? null,
      oldPipeline: showReuploadHint,
      pipelineVersion: noteBundle.pipelineVersion,
    }),
    [effectiveCourseId, courseName, linkedCourse?.title, quizConcept, currentStep, STEPS, activeTool, lang, sourceQualityScore, showReuploadHint, noteBundle.pipelineVersion],
  );

  const paletteItems = useMemo<CommandItem[]>(() => {
    const el = lang === 'el';
    const toolItems: CommandItem[] = AVAILABLE_TOOLS.map((tool) => ({
      id: `tool-${tool}`,
      label: `${el ? 'Άνοιγμα' : 'Open'}: ${workspaceToolLabel(tool, el ? 'el' : 'en')}`,
      group: el ? 'Εργαλεία' : 'Tools',
      run: () => openWorkspaceTool(tool),
    }));
    const docActions: CommandItem[] = [];
    if (onReprocessMaterial && linkedCourse) {
      docActions.push({
        id: 'reprocess-preview',
        label: el ? 'Προεπισκόπηση επανεπεξεργασίας' : 'Preview reprocess',
        group: el ? 'Έγγραφο' : 'Document',
        run: () => openReprocessWizard(),
      });
    }
    if (showReuploadHint || showLowQualityBanner) {
      docActions.push({
        id: 'source-quality',
        label: el ? 'Έλεγχος ποιότητας πηγής' : 'View source quality',
        group: el ? 'Έγγραφο' : 'Document',
        run: () => openReprocessWizard(),
      });
    }
    return [
      ...docActions,
      ...toolItems,
      {
        id: 'search-concept',
        label: el ? `Αναζήτηση «${quizConcept}» στις πηγές` : `Find "${quizConcept}" in sources`,
        group: el ? 'Αναζήτηση' : 'Search',
        run: () => openReaderAtSearch(quizConcept, 'reader'),
      },
      {
        id: 'toggle-notes',
        label: el ? 'Σημειώσεις συνεδρίας' : 'Session notes',
        group: el ? 'Πλοήγηση' : 'Navigate',
        run: () => setShowNotes((v) => !v),
      },
      {
        id: 'toggle-zen',
        label: el ? 'Εναλλαγή Zen' : 'Toggle Zen mode',
        group: el ? 'Πλοήγηση' : 'Navigate',
        run: () => setLayout((l) => (l === 'zen' ? 'split' : 'zen')),
      },
    ];
  }, [lang, quizConcept, openWorkspaceTool, openReaderAtSearch, onReprocessMaterial, linkedCourse, showReuploadHint, showLowQualityBanner, openReprocessWizard]);

  useEffect(() => {
    if (layout === 'zen') {
      setChromeHidden(true);
      setLessonCollapsed(true);
    } else {
      setChromeHidden(false);
      setLessonCollapsed(false);
    }
  }, [layout]);

  const nextActionRecommendation = useMemo(
    () => selectNextBestAction({
      lang,
      hasSource: noteBundle.hasSource,
      sourceQuality: sourceQualityScore ?? null,
      showMigration: showReuploadHint,
      showLowQuality: showLowQualityBanner,
      stepIndex: currentStep,
      stepCount: STEPS.length,
      stepMark: stepMarks[currentStep],
      quizPassed,
      weakConceptCount: weakAreaSpots.length,
    }),
    [
      lang, noteBundle.hasSource, sourceQualityScore, showReuploadHint, showLowQualityBanner,
      currentStep, STEPS.length, stepMarks, quizPassed, weakAreaSpots.length,
    ],
  );

  const discoverabilitySummary = useMemo(
    () => buildDiscoverabilitySummary(
      noteBundle.hasSource,
      sourceIntelligence,
      workspaceCorrelation,
      activeTool,
      lang,
      nextActionRecommendation,
    ),
    [noteBundle.hasSource, sourceIntelligence, workspaceCorrelation, activeTool, lang, nextActionRecommendation],
  );

  useEffect(() => {
    if (!onWorkspaceLiveSync) return;
    onWorkspaceLiveSync(createWorkspaceLiveSync({
      snapshot: workspaceContext,
      agentContext: buildFullAgentContext(),
      nextAction: nextActionRecommendation,
      weakConceptCount: weakAreaSpots.length,
      hasSource: noteBundle.hasSource,
      quizPassed,
      stepMark: stepMarks[currentStep],
    }));
  }, [
    onWorkspaceLiveSync, workspaceContext, buildFullAgentContext, nextActionRecommendation,
    weakAreaSpots.length, noteBundle.hasSource, quizPassed, stepMarks, currentStep,
  ]);

  const handleLearningAction = useCallback((action: LearningActionId) => {
    const step = STEPS[currentStep];
    const stepTitle = step?.title ?? quizConcept;
    switch (action) {
      case 'study-section':
        selectWorkspaceStep(currentStep, { focusReader: true });
        break;
      case 'test-me':
        setCurrentStep(Math.max(0, STEPS.length - 1));
        setActiveTool('quiz');
        if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
        break;
      case 'explain-zero': {
        const prompt = buildAgentPromptForSection('explain-zero', stepTitle, quizConcept, lang);
        openAgentForTool(activeTool, prompt, 'explain-zero');
        break;
      }
      case 'flashcards':
        openWorkspaceTool('leitner');
        break;
      case 'ask-agent': {
        const prompt = buildAgentPromptForSection('ask-agent', stepTitle, quizConcept, lang);
        openAgentForTool(activeTool, prompt);
        break;
      }
      case 'mark-understood':
        setStepMarks((m) => ({ ...m, [currentStep]: 'understood' }));
        noteConceptActivity(quizConcept, 'reader', 'read');
        break;
      case 'mark-confusing':
        setStepMarks((m) => ({ ...m, [currentStep]: 'confusing' }));
        noteConceptActivity(quizConcept, 'annotations', 'annotated-confusing');
        break;
    }
  }, [
    STEPS, currentStep, quizConcept, lang, selectWorkspaceStep, layout, isMobile,
    activeTool, openAgentForTool, openWorkspaceTool, noteConceptActivity,
  ]);

  const runNextAction = useCallback(() => {
    if (!nextActionRecommendation) return;
    if (nextActionRecommendation.primary === 'reprocess') openReprocessWizard();
    else handleLearningAction(nextActionRecommendation.primary);
  }, [nextActionRecommendation, openReprocessWizard, handleLearningAction]);

  const feynmanSession = useMemo(
    () => buildFeynmanSessionContent({
      concept: quizConcept,
      text: noteBundle.sourceFullText,
      lang,
      topic: noteBundle.matchingTopic,
      glossary: scopedGlossary,
      sectionLabel: STEPS[currentStep]?.title,
      hasSource: noteBundle.hasSource,
    }),
    [
      quizConcept, noteBundle.sourceFullText, noteBundle.matchingTopic,
      noteBundle.hasSource, scopedGlossary, lang, STEPS, currentStep,
    ],
  );

  const compareSession = useMemo(
    () => buildCompareSessionContent({
      concept: quizConcept,
      text: noteBundle.sourceFullText,
      glossary: scopedGlossary,
      sectionLabel: STEPS[currentStep]?.title,
      hasSource: noteBundle.hasSource,
      lang,
    }),
    [
      quizConcept, noteBundle.sourceFullText, noteBundle.hasSource,
      scopedGlossary, STEPS, currentStep, lang,
    ],
  );

  const debateSession = useMemo(
    () => buildDebateSessionContent({
      concept: quizConcept,
      text: noteBundle.sourceFullText,
      sectionLabel: STEPS[currentStep]?.title,
      hasSource: noteBundle.hasSource,
    }),
    [quizConcept, noteBundle.sourceFullText, noteBundle.hasSource, STEPS, currentStep],
  );

  const simulatorSession = useMemo(
    () => buildSimulatorSessionContent({
      concept: quizConcept,
      text: noteBundle.sourceFullText,
      lang,
      sectionLabel: STEPS[currentStep]?.title,
      hasSource: noteBundle.hasSource,
      scopeKey: progressKey,
      conceptMastery: workspaceCorrelation.conceptMastery,
      daysToExam: workspaceDaysToExam,
    }),
    [quizConcept, noteBundle.sourceFullText, noteBundle.hasSource, lang, STEPS, currentStep, progressKey, workspaceCorrelation.conceptMastery, workspaceDaysToExam],
  );

  const whiteboardSession = useMemo(
    () => buildWhiteboardSessionContent({
      concept: quizConcept,
      text: noteBundle.sourceFullText,
      lang,
      sectionLabel: STEPS[currentStep]?.title,
      hasSource: noteBundle.hasSource,
    }),
    [quizConcept, noteBundle.sourceFullText, noteBundle.hasSource, lang, STEPS, currentStep],
  );

  const timerSession = useMemo(
    () => buildTimerSessionContent({
      concept: quizConcept,
      stepLabel: STEPS[currentStep]?.title,
      stepIndex: currentStep,
      sectionLabel: STEPS[currentStep]?.title,
      lang,
      hasSource: noteBundle.hasSource,
      conceptMastery: workspaceCorrelation.conceptMastery,
      scopeKey: progressKey,
      leitnerDueCount,
      settingsExamDate: userSettings?.examDate,
      courseExamDate: linkedCourse?.examDate,
    }),
    [
      quizConcept, STEPS, currentStep, lang, noteBundle.hasSource,
      workspaceCorrelation.conceptMastery, progressKey, leitnerDueCount,
      userSettings?.examDate, linkedCourse?.examDate,
    ],
  );

  const dashboardSession = useMemo(
    () => buildDashboardSessionContent({
      concept: quizConcept,
      sectionLabel: STEPS[currentStep]?.title,
      hasSource: noteBundle.hasSource,
      conceptMastery,
      weakSpotCount: weakAreaSpots.length,
      leitnerDueCount,
      reviewsDue: dashboardStats.reviewsDue + spacedStepsDue,
      conceptBus,
    }),
    [
      quizConcept, STEPS, currentStep, noteBundle.hasSource, conceptMastery,
      weakAreaSpots.length, leitnerDueCount, dashboardStats.reviewsDue,
      spacedStepsDue, conceptBus,
    ],
  );

  const dashboardWeakSpotsDetail = useMemo(
    () => buildDashboardWeakSpots(weakAreaSpots, conceptBus, lang),
    [weakAreaSpots, conceptBus, lang],
  );

  const dashboardMiniProps = useMemo(() => {
    const enrichedWeak = dashboardWeakSpotsDetail.map((s) => ({
      concept: s.concept,
      mastery: s.mastery,
      course: s.course,
    }));
    const base = learnerModel
      ? buildMiniDashboardProps(learnerModel, {
        streak: dashboardStats.streak,
        reviewsDue: dashboardStats.reviewsDue,
        studyTimeToday: dashboardStats.studyTimeToday ?? 0,
        studyTimeWeek: dashboardStats.studyTimeWeek ?? 0,
      }, tasks, onStartTask, courseName, {
        conceptInsights: conceptBusInsights,
        extraReviewsDue: spacedStepsDue,
        conceptBus,
      })
      : {
        readiness: Math.round(conceptMastery),
        streak: dashboardStats.streak,
        reviewsDue: dashboardStats.reviewsDue + spacedStepsDue,
        studyTimeToday: dashboardStats.studyTimeToday ?? 0,
        studyTimeWeek: dashboardStats.studyTimeWeek ?? 0,
        recentStudyDays: [] as number[],
        weakSpots: enrichedWeak,
        nextActions: [] as { label: string; type: string; minutes: number; xp?: number; taskId?: string }[],
        conceptsMastered: 0,
        totalConcepts: 0,
        toolActivity: buildToolActivityBreakdown(conceptBus),
      };
    return {
      ...base,
      weakSpots: enrichedWeak.length > 0 ? enrichedWeak : base.weakSpots,
      weakSpotsDetail: dashboardWeakSpotsDetail,
    };
  }, [
    learnerModel, dashboardStats, tasks, onStartTask, courseName,
    conceptBusInsights, spacedStepsDue, conceptBus, conceptMastery,
    dashboardWeakSpotsDetail,
  ]);

  const activeConceptLabel = effectiveFocus?.term ?? quizConcept;

  const conceptLensView = useMemo(
    () => buildConceptLensView({
      concept: activeConceptLabel,
      hasSource: noteBundle.hasSource,
      nodes: noteBundle.conceptMap.nodes,
      edges: noteBundle.conceptMap.edges,
      glossary: scopedGlossary,
      topics: linkedCourse?.topics ?? [],
      steps: STEPS,
      conceptBars,
      busState: conceptBus,
      weakSpots: weakAreaSpots,
      sourceText: noteBundle.sourceFullText,
    }),
    [
      activeConceptLabel, noteBundle, scopedGlossary, linkedCourse, STEPS,
      conceptBars, conceptBus, weakAreaSpots,
    ],
  );

  const openReaderAtConceptSection = useCallback(() => {
    const idx = conceptLensView.readerStepIndex;
    if (idx != null) {
      selectWorkspaceStep(idx, { focusReader: true });
      noteConceptActivity(activeConceptLabel, 'reader', 'read');
      return;
    }
    openReaderForTerm(activeConceptLabel, activeTool);
  }, [
    conceptLensView.readerStepIndex, selectWorkspaceStep, openReaderForTerm,
    activeConceptLabel, activeTool, noteConceptActivity,
  ]);

  const handleConceptBusRemediation = useCallback((concept: string, action: ConceptRemediationId) => {
    focusOnTerm(concept, activeTool);
    noteConceptActivity(concept, activeTool, 'focus');
    const source = noteBundle.sourceFullText?.trim();
    const stepIdx = resolveWorkspaceStepForConcept(concept, STEPS, source);
    if (stepIdx != null && stepIdx >= 0) selectWorkspaceStep(stepIdx);
    const stepTitle = stepIdx != null ? (STEPS[stepIdx]?.title ?? concept) : concept;

    switch (action) {
      case 'reader':
        openReaderForTerm(concept, activeTool);
        break;
      case 'quiz':
        openWorkspaceTool('quiz');
        break;
      case 'flashcards':
        openWorkspaceTool('leitner');
        break;
      case 'feynman':
        openWorkspaceTool('feynman');
        break;
      case 'compare':
        openWorkspaceTool('compare');
        break;
      case 'explain': {
        const prompt = buildAgentPromptForSection('explain-zero', stepTitle, concept, lang);
        openAgentForTool('feynman', prompt, 'explain-zero', stepTitle);
        break;
      }
      case 'ask-agent': {
        const prompt = buildAgentPromptForSection('ask-agent', stepTitle, concept, lang);
        openAgentForTool(activeTool, prompt, 'default', stepTitle);
        break;
      }
    }
  }, [
    focusOnTerm, activeTool, noteConceptActivity, noteBundle.sourceFullText, STEPS,
    selectWorkspaceStep, currentStep, openReaderForTerm,
    openWorkspaceTool, lang, openAgentForTool,
  ]);

  const handleConceptLensAction = useCallback((action: ConceptLensAction) => {
    switch (action) {
      case 'open-reader':
        openReaderAtConceptSection();
        break;
      case 'explain':
        handleLearningAction('explain-zero');
        break;
      case 'quiz':
        handleLearningAction('test-me');
        break;
      case 'flashcards':
        handleLearningAction('flashcards');
        break;
      case 'compare':
        openWorkspaceTool('compare');
        break;
      case 'debate':
        openWorkspaceTool('debate');
        break;
      case 'feynman':
        openWorkspaceTool('feynman');
        break;
      case 'mark-confusing':
        handleLearningAction('mark-confusing');
        break;
      case 'mark-mastered':
        handleLearningAction('mark-understood');
        break;
    }
  }, [
    openReaderAtConceptSection, handleLearningAction, openWorkspaceTool,
    noteConceptActivity, activeConceptLabel,
  ]);

  const handleStepNext = () => {
    const onQuizStep = currentStep === STEPS.length - 1;
    if (onQuizStep && !quizPassed) return;
    recordStepVisit(progressKey, currentStep, conceptMastery);
    onConceptBusDirty?.();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  return (
    <div
      className={cn(
        agentSplit
          ? 'relative h-full w-full bg-surface-primary flex flex-col blueprint-canvas blueprint-grid'
          : 'fixed inset-0 z-50 bg-surface-primary flex flex-col blueprint-canvas blueprint-grid',
        isMobile && !chromeHidden && 'pb-14',
      )}
      data-testid="study-workspace"
      data-grounded={noteBundle.hasSource ? 'true' : 'false'}
    >
      {/* Unified top bar: identity + breadcrumb (left), learning + global actions (right). */}
      {!chromeHidden && (
        <div
          className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-subtle bg-surface-secondary/85 backdrop-blur-xl shrink-0"
          data-testid="workspace-context-strip"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button onClick={onClose} title={lang === 'el' ? 'Κλείσιμο χώρου μελέτης' : 'Close workspace'} aria-label={lang === 'el' ? 'Κλείσιμο' : 'Close'} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="ws-title truncate text-text-primary shrink-0 max-w-[40vw]" data-testid="workspace-header-title">
                {courseName ?? linkedCourse?.title ?? taskTitle ?? quizConcept}
              </h1>
              {(courseName || linkedCourse?.title) && taskTitle && taskTitle !== (courseName ?? linkedCourse?.title) && (
                <span className="hidden md:inline-block px-2 py-0.5 rounded-md border border-border-subtle bg-surface-hover ws-eyebrow text-text-secondary shrink-0 truncate max-w-[140px]">
                  {taskTitle}
                </span>
              )}
              {/* Breadcrumb trail — section · step · quality. Course lives in the title, tool in the panel header (no duplication). */}
              <span className="hidden lg:flex items-center gap-1.5 min-w-0 ws-caption text-text-muted">
                <ChevronRight className="w-3.5 h-3.5 text-text-muted/60 shrink-0" aria-hidden />
                <span className="truncate max-w-[200px] text-text-secondary" title={workspaceContext.sectionLabel} data-testid="workspace-context-section">
                  {workspaceContext.lowConfidenceSection && (
                    <AlertTriangle className="mr-0.5 inline h-3 w-3 text-accent-amber align-[-2px]" aria-hidden />
                  )}
                  {workspaceContext.sectionLabel}
                </span>
                <span aria-hidden>·</span>
                <span className="shrink-0" data-testid="workspace-context-step">{workspaceContext.stepLabel}</span>
                <span className="hidden" data-testid="workspace-context-tool">{workspaceContext.toolLabel}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {nextActionRecommendation && noteBundle.hasSource && (layout === 'focus-tool' || lessonCollapsed) && (
              <button
                type="button"
                onClick={runNextAction}
                data-testid="workspace-next-action"
                className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 ws-caption font-semibold text-brand-300 hover:bg-brand-500/15 transition-colors"
              >
                {nextActionLabel(nextActionRecommendation.primary, lang)}
              </button>
            )}
            {nextActionRecommendation && noteBundle.hasSource && (layout === 'focus-tool' || lessonCollapsed) && (
              <span className="mx-0.5 hidden h-5 w-px bg-border-subtle sm:block" aria-hidden />
            )}

            {layout !== 'zen' && (
              <button
                type="button"
                onClick={() => setShowPalette(true)}
                data-testid="workspace-command-palette-open"
                title={lang === 'el' ? 'Παλέτα εντολών (⌘K)' : 'Command palette (⌘K)'}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-hover ws-eyebrow font-mono text-text-secondary hover:text-text-primary shrink-0 transition-colors"
              >
                ⌘K
              </button>
            )}
            <button onClick={() => setShowNotes((v) => !v)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0" title={lang === 'el' ? 'Σημειώσεις' : 'Session notes'} aria-label={lang === 'el' ? 'Σημειώσεις' : 'Session notes'}>
              <StickyNote className={cn('w-4 h-4', showNotes && 'text-accent-cyan')} />
            </button>
            <button onClick={() => setLayout(layout === 'zen' ? 'split' : 'zen')} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0" title={layout === 'zen' ? (lang === 'el' ? 'Έξοδος εστίασης (Z)' : 'Exit focus (Z)') : (lang === 'el' ? 'Εναλλαγή διάταξης (S)' : 'Toggle layout (S)')} aria-label={layout === 'zen' ? (lang === 'el' ? 'Έξοδος εστίασης' : 'Exit focus') : (lang === 'el' ? 'Εναλλαγή διάταξης' : 'Toggle layout')}>
              {layout === 'zen' ? <Minimize2 className="w-4 h-4 text-accent-cyan" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button onClick={handleOpenAgent} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full ws-eyebrow font-medium border border-border-subtle bg-surface-card hover:border-accent-cyan/40 hover:bg-surface-hover text-text-secondary hover:text-text-primary shrink-0 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" /> {t('agentBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Progress mini-bar */}
      <div className="relative z-10 h-0.5 bg-white/5 shrink-0">
        <div className="h-0.5 bg-gradient-to-r from-accent-cyan to-brand-400 transition-all duration-500" style={{ width: `${STEPS.length ? Math.max(5, ((Math.min(currentStep, STEPS.length - 1) + 1) / STEPS.length) * 100) : 5}%` }} />
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Tool Dock (Left Sidebar) */}
        {!chromeHidden && !isMobile && (
          <WorkspaceDock 
            activeTool={activeTool} 
            onSelectTool={openWorkspaceTool} 
            availableTools={AVAILABLE_TOOLS} 
            lang={lang}
          />
        )}

        <Group orientation={isMobile ? "vertical" : "horizontal"} className="flex-1 w-full h-full">
          {/* Left: Lesson content */}
          {(layout === 'split' || layout === 'focus-lesson' || layout === 'zen') && (
            <>
            <Panel
              id="lesson-panel"
              defaultSize={layout === 'focus-lesson' || layout === 'zen' ? 100 : 35}
              minSize={25}
              collapsible
              className="flex flex-col bg-surface-primary"
            >
              {!chromeHidden && (
                <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle overflow-x-auto hide-scrollbar shrink-0 bg-surface-card">
                  <button onClick={() => setLessonCollapsed(!lessonCollapsed)} className="p-1 rounded hover:bg-surface-hover text-text-muted shrink-0 mr-2">
                    {lessonCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
                  </button>
                  {STEPS.map((s, i) => (
                    <button key={i} onClick={() => selectWorkspaceStep(i, { focusReader: true })}
                      data-testid={`workspace-step-rail-${i}`}
                      className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0 transition-all',
                        currentStep === i ? 'bg-accent-cyan/15 text-accent-cyan' : i < currentStep ? 'text-accent-emerald hover:bg-surface-hover' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover')}>
                      <span className={cn('w-4 h-4 rounded-full border text-[8px] flex items-center justify-center relative',
                        currentStep === i ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10' : i < currentStep ? 'border-accent-emerald text-accent-emerald bg-accent-emerald/10' : 'border-text-muted/30')}>
                        {i < currentStep ? '✓' : i + 1}
                        {readerStepHeatLevels[i] && (
                          <span
                            className={cn('absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-surface-card', stepHeatDotClass(readerStepHeatLevels[i]!))}
                            data-testid={`workspace-step-heat-${i}`}
                            title={readerHeatSyncReport.steps[i]?.heatReasons.join(' · ')}
                          />
                        )}
                      </span>
                      <span className="hidden sm:inline">
                        {(() => {
                          const label = displayWorkspaceStepTitle(s.title, quizConcept, lang);
                          return label.length > 16 ? `${label.slice(0, 14)}…` : label;
                        })()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 relative">
                {(showLowQualityBanner || showReuploadHint) && sourceQualityScore != null && (
                  <WorkspaceSourceStatusBar
                    lang={lang}
                    score={sourceQualityScore}
                    sectionCount={sourceIntelligence?.documentStructure?.sectionCount}
                    showMigration={showReuploadHint}
                    showQualityWarning={showLowQualityBanner}
                    reprocessing={reprocessingMaterial}
                    onInspect={openReprocessWizard}
                    onReprocess={onReprocessMaterial ? openReprocessWizard : undefined}
                    onReupload={handleReuploadMaterial}
                  />
                )}
                {sourceIntelligence && !chromeHidden && !(showLowQualityBanner || showReuploadHint) && (
                  <div className="mb-4 max-w-2xl mx-auto">
                    {!sourceIntelExpanded ? (
                      <button
                        type="button"
                        onClick={() => setSourceIntelExpanded(true)}
                        data-testid="source-intel-collapsed"
                        className="w-full flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-surface-card/60 px-3 py-2 text-left hover:bg-surface-hover transition-colors"
                      >
                        <span className="text-[11px] text-text-secondary">
                          {lang === 'el' ? 'Ποιότητα πηγής' : 'Source quality'}{' '}
                          <span className="font-semibold text-text-primary">{sourceIntelligence.score}/100</span>
                          {' · '}
                          {sourceIntelligence.documentStructure?.sectionCount ?? 0}{' '}
                          {lang === 'el' ? 'ενότητες' : 'sections'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setSourceIntelExpanded(false)}
                          className="text-[10px] text-text-muted hover:text-text-secondary"
                        >
                          {lang === 'el' ? '← Σύμπτυξη' : '← Collapse'}
                        </button>
                        <SourceIntelligenceCard
                          report={sourceIntelligence}
                          toolLabel={activeTool}
                          onOpenRecommendedTool={() => {
                            setActiveTool(sourceIntelligence.bestTool as WorkspaceTool);
                            if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div key={currentStep} className="w-full min-w-0 animate-fade-up max-w-2xl mx-auto">
                  <LessonContent
                    step={currentStep}
                    stepCount={STEPS.length}
                    stepTitle={STEPS[currentStep]?.title}
                    stepType={STEPS[currentStep]?.type}
                    concept={quizConcept}
                    activeTool={activeTool}
                    onOpenTool={openWorkspaceTool}
                    onOpenAgent={handleOpenAgent}
                    quizDef={quizDef}
                    quizPassed={quizPassed}
                    genStatus={genStatus}
                    noteExcerpt={noteBundle.readerText}
                    hasSource={noteBundle.hasSource}
                    emptyMessage={toolEmptyMessage('lesson')}
                    onUpload={handleToolUpload}
                    onQuizComplete={(correct: boolean) => {
                      setQuizPassed(correct);
                      if (noteBundle.hasSource) {
                        recordQuizResponse(progressKey, quizConcept, quizDef, correct, conceptMastery);
                        setQuizIrtRevision((v) => v + 1);
                      }
                    }}
                    quizIrt={quizIrtDisplay}
                    quizSessionItems={quizSession.items}
                    quizSessionScopeKey={progressKey}
                    t={t as any}
                    lang={lang}
                    onLearningAction={handleLearningAction}
                    nextActionRecommendation={nextActionRecommendation}
                    onReprocess={openReprocessWizard}
                    stepUnderstood={stepMarks[currentStep] === 'understood'}
                    stepConfusing={stepMarks[currentStep] === 'confusing'}
                    onSelectionAction={handleWorkspaceSelectionAction}
                    onRemediateWrong={handleQuizRemediateWrong}
                  />
                </div>
                
                {/* Navigation footer */}
                <div className="mt-8 pt-4 border-t border-border-subtle flex items-center justify-between">
                  <button onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)} disabled={currentStep === 0}
                    className={cn('text-xs', currentStep === 0 ? 'text-text-muted' : 'text-text-secondary hover:text-text-primary')}>← {t('previous')}</button>
                  <span className="text-[10px] text-text-muted">{currentStep + 1}/{STEPS.length}</span>
                  <button onClick={handleStepNext}
                    className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium">
                    {currentStep === STEPS.length - 1 ? t('finish') : t('next')} <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </Panel>
            
            {(layout === 'split') && (
              <Separator className="w-1 bg-border-subtle hover:bg-brand-500/50 active:bg-brand-500 transition-colors cursor-col-resize z-20">
                 <div className="h-full w-full flex items-center justify-center">
                    <div className="h-8 w-1 bg-white/20 rounded-full" />
                 </div>
              </Separator>
            )}
            </>
          )}

          {/* Right: Active tool */}
          {(layout === 'split' || layout === 'focus-tool') && (
            <Panel
              id="tool-panel"
              defaultSize={layout === 'focus-tool' ? 100 : 65}
              minSize={25}
              className="flex flex-col bg-surface-primary"
            >
              {!chromeHidden && (
                <WorkspaceToolHeader
                  activeTool={activeTool}
                  lang={lang}
                  concept={effectiveFocus?.term ?? quizConcept}
                  hasSource={noteBundle.hasSource}
                  sourceName={noteBundle.sourceName}
                  onJumpTool={(tool) => {
                    openWorkspaceTool(tool);
                    noteConceptActivity(quizConcept, tool, 'focus');
                  }}
                  onOpenReader={handleCrossLinkReader}
                  onAskAgent={handleCrossLinkAgent}
                />
              )}
              {/* Tool surface */}
              <div className="flex-1 relative overflow-hidden bg-surface-primary/50 flex flex-col">
                <div
                  className="shrink-0 sticky top-0 z-30 bg-surface-primary/95 backdrop-blur border-b border-white/5 shadow-[0_8px_24px_rgba(2,6,23,0.35)]"
                  data-testid="workspace-intelligence-rail"
                >
                <WorkspaceMobileIntelligenceTabs
                  active={intelTab}
                  onChange={(tab) => setIntelTab((t) => (t === tab ? null : tab))}
                  lang={lang}
                  badges={{
                    'weak-areas': weakAreaSpots.length,
                    'concept-bus': conceptBusRows.length,
                  }}
                />
                {intelTab && (
                  <div
                    role="tabpanel"
                    id={intelPanelId(intelTab)}
                    aria-labelledby={`workspace-intel-tab-${intelTab}`}
                    className={cn(
                      'overflow-y-auto overscroll-contain border-t border-white/5',
                      isMobile ? 'max-h-[min(50vh,18rem)]' : 'max-h-[min(45vh,20rem)]',
                    )}
                  >
                {intelTab === 'discover' && (
                  <WorkspaceDiscoverabilityPanel
                    summary={discoverabilitySummary}
                    lang={lang}
                    expanded
                    onToggle={() => setIntelTab(null)}
                    actions={discoverabilityActions}
                    onRunNextAction={runNextAction}
                    onLearningAction={handleLearningAction}
                    stepUnderstood={stepMarks[currentStep] === 'understood'}
                    stepConfusing={stepMarks[currentStep] === 'confusing'}
                    onOpenRecommendedTool={
                      discoverabilitySummary.recommendedTool
                        ? () => openWorkspaceTool(discoverabilitySummary.recommendedTool as WorkspaceTool)
                        : undefined
                    }
                  />
                )}
                {intelTab === 'concept-bus' && (
                  <ConceptBusPanel
                    rows={conceptBusRows}
                    activeTool={activeTool}
                    lang={lang}
                    expanded
                    onToggle={() => setIntelTab(null)}
                    onFocusTerm={(term) => focusOnTerm(term, activeTool)}
                    onJumpTool={(tool) => openWorkspaceTool(tool)}
                    onRemediate={handleConceptBusRemediation}
                    activeLens={conceptLensView}
                    onOpenReaderSection={openReaderAtConceptSection}
                  />
                )}
                {intelTab === 'weak-areas' && (
                  <WeakAreasFocusRail
                    spots={weakAreaSpots}
                    focusTerm={effectiveFocus?.term}
                    lang={lang}
                    expanded
                    onToggle={() => setIntelTab(null)}
                    onFocusWeakSpot={focusWeakArea}
                  />
                )}
                  </div>
                )}
                </div>

                <div className="flex-1 relative overflow-hidden min-h-0">
                <ConceptLensPanel
                  lens={conceptLensView}
                  activity={activityFor(conceptBus, activeConceptLabel)}
                  activeTool={activeTool}
                  expanded={conceptLensExpanded}
                  onToggleExpand={() => setConceptLensExpanded((v) => !v)}
                  onJumpTool={(tool) => openWorkspaceTool(tool)}
                  onFocus={(term) => focusOnTerm(term, activeTool)}
                  onAction={handleConceptLensAction}
                  onOpenReaderSection={openReaderAtConceptSection}
                  lang={lang}
                />

                {activeTool === 'concept-map' && (
                  <DraggableConceptMap
                    initialNodes={conceptNodes}
                    initialEdges={conceptEdges}
                    onNodeUpdate={handleConceptMapSave}
                    emptyMessage={toolEmptyMessage('concept-map')}
                    onUpload={handleToolUpload}
                    hasSource={noteBundle.hasSource}
                    focusConcept={effectiveFocus?.term}
                    lensConcept={activeConceptLabel}
                    conceptLens={conceptLensView}
                    onConceptSelect={(term) => focusOnTerm(term, 'concept-map')}
                    onFocusTerm={(term) => {
                      noteConceptActivity(term, 'concept-map', 'mapped');
                      openReaderForTerm(term, 'concept-map');
                    }}
                    onSelectionAction={handleWorkspaceSelectionAction}
                    cursorSync={layout === 'split' ? conceptMapCursorSync : undefined}
                  />
                )}
                {activeTool === 'reader' && (
                  <CognitiveReader
                    text={readerText}
                    highlight={mergeReaderHighlight(sourceHighlight, effectiveFocus ?? {})}
                    focusTerm={effectiveFocus?.term}
                    onTermFocus={(term) => {
                      noteConceptActivity(term, 'reader', 'read');
                      focusOnTerm(term, 'reader');
                    }}
                    annotationScopeKey={progressKey}
                    sourceName={noteBundle.sourceName}
                    lang={lang}
                    glossary={scopedGlossary}
                    concept={quizConcept}
                    userSettings={userSettings}
                    emptyMessage={toolEmptyMessage('reader')}
                    onUpload={handleToolUpload}
                    hasSource={noteBundle.hasSource}
                    sourceFullText={noteBundle.sourceFullText}
                    scrollToSegmentIndex={readerStepSegmentIndex}
                    scrollToSegmentStepIndex={currentStep}
                    onSectionNavSelect={handleReaderSectionNavSelect}
                    onSectionStudy={handleSectionStudy}
                    onSectionAskAgent={handleSectionAskAgent}
                    onSelectionAction={handleWorkspaceSelectionAction}
                    ocrRegions={readerOcrRegions}
                    conceptBus={conceptBus}
                    stepMarks={stepMarks}
                    stepTitles={STEPS.map((s) => s.title)}
                    stepToSegmentIndex={readerStepToSegmentIndex}
                    stepHeatSync={readerActiveStepSync}
                  />
                )}
                {activeTool === 'scratchpad' && (
                  <FormulaScratchpad
                    noteFormulas={noteBundle.formulas}
                    emptyMessage={toolEmptyMessage('scratchpad')}
                    onUpload={handleToolUpload}
                    hasSource={noteBundle.hasSource}
                    scopeKey={progressKey}
                    concept={quizConcept}
                    sectionLabel={STEPS[currentStep]?.title}
                    sectionIndex={currentStep}
                    notesDraft={notes}
                    onNotesDraftChange={setNotes}
                    onEntrySaved={(entry) => {
                      noteConceptActivity(entry.concept ?? quizConcept, 'scratchpad', 'noted');
                      if (entry.mode === 'confusion-log') {
                        noteConceptActivity(entry.concept ?? quizConcept, 'scratchpad', conceptSignalForAnnotationCategory('confusing'));
                      }
                    }}
                    onConvertToFlashcard={(card, entry) => {
                      setCustomLeitnerCards(appendCustomLeitnerCard(progressKey, { ...card, source: 'scratchpad' }));
                      noteConceptActivity(entry.concept ?? quizConcept, 'scratchpad', 'noted');
                      noteConceptActivity(entry.concept ?? quizConcept, 'leitner', 'focus');
                      openWorkspaceTool('leitner');
                    }}
                    onConvertToAnnotation={(entry) => {
                      if (!noteBundle.hasSource || noteBundle.fileKey === 'no-source') return;
                      appendScratchpadAnnotation(
                        noteBundle.fileKey,
                        entry,
                        noteBundle.annotationText,
                        { courseId: effectiveCourseId, pipelineVersion: noteBundle.pipelineVersion },
                      );
                      const signal = entry.mode === 'confusion-log'
                        ? conceptSignalForAnnotationCategory('confusing')
                        : entry.mode === 'exam-draft'
                          ? conceptSignalForAnnotationCategory('exam-relevant')
                          : 'annotated';
                      noteConceptActivity(entry.concept ?? quizConcept, 'annotations', signal);
                      openWorkspaceTool('annotations');
                    }}
                    onAskAgentAboutNote={(text, mode) => {
                      const section = STEPS[currentStep]?.title ?? quizConcept;
                      const noteMode = mode === 'self-explanation' || mode === 'exam-draft' ? mode : 'notes';
                      const prompt = buildScratchpadNoteAgentPrompt(text, section, noteMode, lang);
                      openAgentForTool(
                        'scratchpad',
                        prompt,
                        noteMode === 'notes' ? 'scratchpad-note' : 'feynman-critique',
                      );
                    }}
                    onSendToWhiteboard={sendScratchpadToWhiteboard}
                    onAskAgent={(formulaText) => {
                      openAgentForTool(
                        'scratchpad',
                        buildFormulaAgentPrompt(formulaText, lang),
                        'formula',
                      );
                    }}
                    lang={lang}
                  />
                )}
                {activeTool === 'whiteboard' && (
                  <WhiteboardPanel
                    session={whiteboardSession}
                    concept={quizConcept}
                    lang={lang}
                    storageScope={`${progressKey}:${quizConcept}`}
                    scratchpadImport={scratchpadImport}
                    onDismissScratchpadImport={() => setScratchpadImport(null)}
                    emptyMessage={toolEmptyMessage('whiteboard')}
                    onUpload={handleToolUpload}
                    onEngage={() => noteConceptActivity(quizConcept, 'whiteboard', 'noted')}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'whiteboard')}
                    relatedConcepts={[
                      ...conceptLensView.related.map((r) => r.label),
                      ...conceptLensView.followUp.map((r) => r.label),
                    ].slice(0, 6)}
                    prerequisiteConcepts={conceptLensView.prerequisites.map((r) => r.label).slice(0, 4)}
                    weakFocus={
                      weakAreaSpots.find((s) => s.concept.toLowerCase() === quizConcept.toLowerCase())
                        ?.reasons[0]?.label
                      ?? (conceptLensView.struggling ? quizConcept : undefined)
                    }
                    onAskAgent={(prompt, intent) => {
                      const agentIntent: ToolAgentIntent = intent === 'critique'
                        ? 'diagram-critique'
                        : 'diagram-coach';
                      openAgentForTool('whiteboard', prompt, agentIntent);
                      noteConceptActivity(quizConcept, 'whiteboard', 'noted');
                    }}
                  />
                )}
                {activeTool === 'dashboard' && (
                  <DashboardPanel
                    session={dashboardSession}
                    concept={quizConcept}
                    lang={lang}
                    miniProps={dashboardMiniProps}
                    emptyMessage={toolEmptyMessage('dashboard')}
                    onUpload={handleToolUpload}
                    onFocusWeakSpot={focusWeakArea}
                    onStartTask={onStartTask}
                    onOpenSuggestedTool={() => {
                      const tool = dashboardSession.suggestFocusTool;
                      if (tool) openWorkspaceTool(tool);
                    }}
                    onOpenToolActivity={(tool) => openWorkspaceTool(tool)}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'dashboard')}
                    onRemediateWeakSpot={handleConceptBusRemediation}
                    courseName={courseName ?? linkedCourse?.title}
                    nextAction={nextActionRecommendation}
                  />
                )}
                {activeTool === 'leitner' && (
                  <LeitnerPanel
                    session={leitnerSession}
                    concept={quizConcept}
                    lang={lang}
                    scopeKey={`${progressKey}:${quizConcept}`}
                    spacingIntervals={learnerModel?.spacingIntervals ?? []}
                    emptyMessage={toolEmptyMessage('leitner')}
                    onUpload={handleToolUpload}
                    onRate={(rating) => {
                      onLeitnerRate?.(quizConcept, rating);
                      noteConceptActivity(quizConcept, 'leitner', rating === 'again' || rating === 'hard' ? 'leitner-hard' : 'leitner-easy');
                    }}
                    onOpenQuiz={() => openWorkspaceTool('quiz')}
                    onQuizCard={(front) => {
                      focusOnTerm(front, 'leitner');
                      noteConceptActivity(quizConcept, 'quiz', 'focus');
                      openWorkspaceTool('quiz');
                    }}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'leitner')}
                    artifactStale={leitnerArtifactStale}
                    onAcknowledgeStale={() => acknowledgePracticeStale('leitner')}
                  />
                )}
                {activeTool === 'timer' && (
                  <TimerPanel
                    session={timerSession}
                    concept={quizConcept}
                    lang={lang}
                    scopeKey={progressKey}
                    stepLabel={STEPS[currentStep]?.title}
                    stepIndex={currentStep}
                    conceptMastery={workspaceCorrelation.conceptMastery}
                    emptyMessage={toolEmptyMessage('timer')}
                    onUpload={handleToolUpload}
                    onSessionComplete={(minutes, label) => {
                      onLogStudyMinutes?.(minutes, label);
                      noteConceptActivity(quizConcept, 'timer', 'noted');
                    }}
                    onOpenBreakTool={() => openWorkspaceTool('leitner')}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'timer')}
                    onOpenSimulator={() => openWorkspaceTool('simulator')}
                    activeExamPractice={pendingExamPractice}
                    settingsExamDate={userSettings?.examDate}
                    courseExamDate={linkedCourse?.examDate}
                  />
                )}
                {activeTool === 'simulator' && (
                  <SimulatorPanel
                    session={simulatorSession}
                    concept={quizConcept}
                    lang={lang}
                    emptyMessage={toolEmptyMessage('simulator')}
                    onUpload={handleToolUpload}
                    onEngage={() => noteConceptActivity(quizConcept, 'simulator', 'simulated')}
                    onSensitivityCue={(cueId) => setSandboxTopSensitivityCue(cueId)}
                    onScenarioSelect={(scenarioId: SimulatorScenarioId) => {
                      saveLastSimulatorScenario(progressKey, scenarioId);
                      saveExamPracticePreset(progressKey, examPracticePresetForScenario(scenarioId));
                      noteConceptActivity(quizConcept, 'simulator', 'simulated');
                    }}
                    onStartTimedPractice={(presetId) => {
                      saveExamPracticePreset(progressKey, presetId);
                      setPendingExamPractice(presetId);
                      noteConceptActivity(quizConcept, 'timer', 'focus');
                      openWorkspaceTool('timer');
                    }}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'simulator')}
                    artifactStale={simulatorArtifactStale}
                    onAcknowledgeStale={() => acknowledgePracticeStale('simulator')}
                    scopeKey={progressKey}
                  />
                )}
                {activeTool === 'compare' && (
                  <ComparePanel
                    session={compareSession}
                    concept={quizConcept}
                    lang={lang}
                    focusTerm={effectiveFocus?.term}
                    emptyMessage={toolEmptyMessage('compare')}
                    onUpload={handleToolUpload}
                    onRowFocus={(term) => {
                      noteConceptActivity(term, 'compare', 'read');
                      focusOnTerm(term, 'compare');
                    }}
                    onSelectionAction={handleWorkspaceSelectionAction}
                    onExplainDifference={(row) => {
                      const prompt = buildCompareDifferencePrompt(row.text, quizConcept, lang);
                      openAgentForTool('compare', prompt, 'compare-row');
                      noteConceptActivity(row.term, 'compare', 'read');
                    }}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'compare')}
                    onAskAgent={() => {
                      openAgentForTool('compare', buildCompareToolAgentPrompt(quizConcept, lang));
                    }}
                  />
                )}
                {activeTool === 'debate' && (
                  <DebatePanel
                    session={debateSession}
                    concept={quizConcept}
                    lang={lang}
                    storageScope={`${progressKey}:${quizConcept}`}
                    focusTerm={effectiveFocus?.term}
                    emptyMessage={toolEmptyMessage('debate')}
                    onUpload={handleToolUpload}
                    onOpenInReader={(claim) => {
                      noteConceptActivity(quizConcept, 'debate', 'mapped');
                      openReaderAtSearch(claim, 'debate');
                    }}
                    onAskAgent={(claimText) => {
                      const claim = claimText?.trim() || quizConcept;
                      openAgentForTool('debate', buildDebateClaimAgentPrompt(claim, lang));
                    }}
                    onSelectionAction={handleWorkspaceSelectionAction}
                    onRebuttalPersisted={() => {
                      noteConceptActivity(quizConcept, 'debate', 'noted');
                    }}
                  />
                )}
                {activeTool === 'feynman' && (
                  <FeynmanCheck
                    concept={quizConcept}
                    settings={userSettings}
                    hasSource={noteBundle.hasSource}
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={handleToolUpload}
                    onAskAgent={() => {
                      openAgentForTool('feynman', buildFeynmanToolAgentPrompt(quizConcept, lang));
                    }}
                    onAskAgentWithPrompt={(prompt) => {
                      openAgentForTool('feynman', prompt);
                    }}
                    outline={feynmanSession.outline}
                    placeholder={feynmanSession.placeholder}
                    gapHints={feynmanSession.gapHints}
                    gapTerms={feynmanSession.gapTerms}
                    referenceNotes={feynmanSession.referenceExcerpt || undefined}
                    glossary={scopedGlossary}
                    extraTerms={noteBundle.matchingTopic?.title ? [noteBundle.matchingTopic.title] : undefined}
                    sectionLabel={feynmanSession.sectionLabel}
                    keyTerms={feynmanSession.keyTerms}
                    weakExtraction={feynmanSession.weakExtraction}
                    draftScopeKey={progressKey}
                    initialDraft={loadFeynmanDraft(progressKey)}
                    onExplanationSubmitted={() => {
                      noteConceptActivity(quizConcept, 'feynman', 'explained');
                    }}
                    onFocusConcept={() => openWorkspaceTool('concept-map')}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'feynman')}
                  />
                )}
                {activeTool === 'annotations' && (
                  <AnnotationOverlay
                    sourceText={noteBundle.annotationText}
                    sourceName={noteBundle.sourceName}
                    fileKey={noteBundle.fileKey}
                    emptyMessage={toolEmptyMessage('annotations')}
                    onUpload={handleToolUpload}
                    hasSource={noteBundle.hasSource}
                    onAskAgent={(text) => {
                      if (!text.trim()) return;
                      openAgentForTool('annotations', buildAnnotationAgentPrompt(text, lang), 'annotation');
                    }}
                    onSelectionAction={handleWorkspaceSelectionAction}
                    concept={quizConcept}
                    focusTerm={effectiveFocus?.term}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'annotations')}
                    pipelineVersion={noteBundle.pipelineVersion}
                    sectionLabel={STEPS[currentStep]?.title}
                    onAnnotate={({ focusTerm, category }) => {
                      const term = focusTerm ?? quizConcept;
                      const cat = category ?? 'general';
                      noteConceptActivity(term, 'annotations', conceptSignalForAnnotationCategory(cat));
                      if (cat === 'confusing') {
                        setStepMarks((m) => ({ ...m, [currentStep]: 'confusing' }));
                      }
                    }}
                    lang={lang}
                    sharedAnnotations={sharedAnnotations}
                    courseId={effectiveCourseId}
                    authToken={userSettings?.authToken}
                    onPublishShared={handlePublishAnnotation}
                    annotationSyncLive={annotationSyncLive}
                    annotationSyncVersion={annotationSyncVersion}
                    annotationSyncMode={annotationSyncMode}
                    onRemapComplete={(count) => {
                      if (count > 0) noteConceptActivity(quizConcept, 'annotations', 'annotated');
                    }}
                  />
                )}
                {activeTool === 'quiz' && (
                  <QuizPanel
                    session={quizSession}
                    concept={quizConcept}
                    lang={lang}
                    scopeKey={progressKey}
                    irt={quizSessionIrt}
                    irtResponseCount={quizIrtState.responses}
                    desiredCount={quizDesiredCount}
                    onChangeDesiredCount={changeQuizDesiredCount}
                    countOptions={QUIZ_COUNT_OPTIONS}
                    emptyMessage={toolEmptyMessage('quiz')}
                    onUpload={handleToolUpload}
                    onSessionComplete={(summary) => {
                      const correct = summary.accuracy >= 60;
                      setQuizPassed(correct);
                      onQuizAttempt?.(quizConcept, correct, summary.meanConfidence);
                      noteConceptActivity(quizConcept, 'quiz', correct ? 'quiz-correct' : 'quiz-wrong');
                      if (noteBundle.hasSource) {
                        recordQuizResponse(
                          progressKey,
                          quizConcept,
                          quizDef,
                          correct,
                          conceptMastery,
                        );
                        setQuizIrtRevision((v) => v + 1);
                      }
                    }}
                    onOpenFlashcards={() => openWorkspaceTool('leitner')}
                    onOpenFeynman={() => openWorkspaceTool('feynman')}
                    onRemediateWrong={handleQuizRemediateWrong}
                    onSelectionAction={handleWorkspaceSelectionAction}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'quiz')}
                    artifactStale={quizArtifactStale}
                    onAcknowledgeStale={() => acknowledgePracticeStale('quiz')}
                  />
                )}
                </div>
              </div>
            </Panel>
          )}
        </Group>
      </div>

      {/* Session notes slide-over */}
      <AnimatePresence>
        {showNotes && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNotes(false)}
              className="absolute inset-0 z-30 bg-slate-950/40"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[380px] bg-surface-secondary/95 backdrop-blur-xl border-l border-white/10 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-accent-cyan" />
                  <span className="text-sm font-semibold">{lang === 'el' ? 'Σημειώσεις συνεδρίας' : 'Session notes'}</span>
                </div>
                <button onClick={() => setShowNotes(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted"><X className="w-4 h-4" /></button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={lang === 'el' ? 'Κράτα σημειώσεις καθώς μελετάς… (αποθηκεύονται τοπικά)' : 'Jot notes as you study… (saved locally)'}
                className="flex-1 w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-text-primary focus:outline-none"
              />
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/8 text-[10px] text-text-muted">
                <span>{lang === 'el' ? 'Αυτόματη αποθήκευση' : 'Auto-saved'}</span>
                <span>{notes.trim().split(/\s+/).filter(Boolean).length} {lang === 'el' ? 'λέξεις' : 'words'}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        items={paletteItems}
        placeholder={lang === 'el' ? 'Εργαλείο, αναζήτηση ή ενέργεια…' : 'Type a tool, search, or action…'}
      />

      <WorkspaceMobileToolDrawer
        open={mobileToolDrawerOpen}
        onClose={() => setMobileToolDrawerOpen(false)}
        activeTool={activeTool}
        availableTools={AVAILABLE_TOOLS}
        onSelectTool={openWorkspaceTool}
        lang={lang}
      />

      {!chromeHidden && isMobile && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[120] flex items-center gap-2 border-t border-border-subtle bg-surface-card/95 px-3 py-2 backdrop-blur-md lg:hidden"
          data-testid="workspace-mobile-tool-bar"
        >
          <button
            type="button"
            onClick={() => setMobileToolDrawerOpen(true)}
            data-testid="workspace-mobile-tools-open"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-brand-600/10 px-3 py-2.5 text-sm font-medium text-brand-200"
          >
            <LayoutGrid className="h-4 w-4" />
            {workspaceToolLabel(activeTool, lang)}
          </button>
        </div>
      )}
      {linkedCourse && (
        <ReprocessPreviewModal
          open={reprocessWizardOpen}
          onClose={() => setReprocessWizardOpen(false)}
          preview={reprocessPreview}
          lang={lang}
          applying={reprocessingMaterial}
          applied={reprocessApplied}
          onApply={onReprocessMaterial ? handleApplyReprocess : undefined}
        />
      )}
    </div>
  );
}
