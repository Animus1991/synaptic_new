import { fallbackWorkspaceSteps } from '../../../lib/noteContentExtractors';
import { workspaceToolLabel } from '../../../lib/workspaceToolRegistry';
import { crossLinkAgentPrompt } from '../WorkspaceToolCrossLinkBar';
import { useWorkspaceNoteBundle } from '../../../lib/useWorkspaceNoteBundle';
import {
  buildWorkspaceEmptyActions,
  workspaceEmptyUploadHandler,
  workspaceToolEmptyMessage,
  type WorkspaceEmptyTool,
} from '../../../lib/workspaceEmptyState';
import { loadWorkspaceStep, saveWorkspaceStep, loadWorkspaceNotes, saveWorkspaceNotes, loadConceptBus, saveConceptBus, loadAllConceptBuses } from '../../../lib/workspacePersistence';
import { buildMiniDashboardProps } from '../../../lib/workspaceData';
import { collectConceptBusInsights, countSpacedStepReviewsDue, type ConceptBusMap } from '../../../lib/conceptBusSync';
import { loadAllStepSchedules } from '../../../lib/spacedStepSchedule';
import { useI18n } from '../../../lib/i18n';
import { findConceptSpan, resolveReaderText, type SourceHighlight } from '../../../lib/conceptProvenance';
import { findTextSpanInFiles } from '../../../lib/findTextSpanInSource';
import type { WorkspaceFocus } from '../../../lib/workspaceFocus';
import {
  type ConceptBusState,
  type ConceptSignal,
  normalizeConceptBusState,
} from '../../../lib/workspaceConceptBus';
import type { ScratchpadExport } from '../../../lib/workspaceScratchpadBridge';
import {
  buildWorkspaceCorrelation,
  orderStepsByMastery,
  resolveConceptMastery,
} from '../../../lib/workspaceCorrelation';
import {
  applySpacedStepBoost,
  loadStepSchedule,
  recordStepVisit,
} from '../../../lib/spacedStepSchedule';
import {
  broadcastAnnotationSync,
  connectAnnotationStream,
  DEFAULT_ANNOTATION_POLL_MS,
  mergeSharedAnnotations,
  type AnnotationSyncMode,
} from '../../../lib/annotationRealtimeSync';
import { orderDeckByDueQueue } from '../../../lib/leitnerDeckSync';
import { loadExamTarget } from '../../../lib/workspacePersistence';
import { daysUntilExam, type ExamPracticePresetId } from '../../../lib/examPracticePresets';
import { buildAdaptiveQuizFromNotes } from '../../../lib/noteContentExtractors';
import {
  buildQuizIrtDisplay,
  loadQuizIrt,
  targetQuizDifficulty,
} from '../../../lib/quizIrt';
import { buildDiscoverabilitySummary } from '../../../lib/workspaceDiscoverability';
import {
  acknowledgeStaleTool,
  isToolArtifactStale,
  type StalePracticeTool,
} from '../../../lib/artifactStaleness';
import {
  buildSelectionAgentPrompt,
  buildSelectionFlashcard,
  type WorkspaceSelectionActionId,
  type WorkspaceSelectionContext,
} from '../../../lib/workspaceSelectionActions';
import { buildReaderSegments } from '../../../lib/readerDocumentLayout';
import { shouldShowCourseQualityBanner } from '../../../lib/courseQualityBanner';
import { buildReprocessPreview, resolveReprocessCourse } from '../../../lib/reprocessPreview';
import { isLowSourceQuality } from '../../../lib/sourceQualityPrompt';
import {
  isWorkspaceQuizStep,
  resolveWorkspaceStepForReaderLabel,
} from '../../../lib/readerStepSync';
import {
  isReaderNavNoop,
  resolveReaderNavToStep,
  resolveStepAfterReprocess,
  buildStepToSegmentMap,
  resolveStepToReaderSegment,
} from '../../../lib/readerStepSyncBridge';
import {
  auditReaderHeatmapStepSync,
  activeStepHeatSyncSummary,
} from '../../../lib/readerHeatmapStepSyncQA';
import type { ReaderHeatmapLevel } from '../../../lib/readerLearningHeatmap';
import {
  buildWeakAreaWorkspaceFocus,
  resolveWorkspaceStepForConcept,
} from '../../../lib/workspaceWeakAreas';
import { buildQuizSessionContent } from '../../../lib/quizSessionModel';
import type { QuizSessionItem } from '../../../lib/quizSession';
import {
  buildQuizMistakeFlashcard,
  buildQuizMistakeFeynmanPrompt,
} from '../../../lib/quizRemediation';
import { appendCustomLeitnerCard, loadCustomLeitnerCards } from '../../../lib/leitnerCustomCards';
import {
  buildAgentPromptForSection,
  type LearningActionId,
} from '../../../lib/workspaceLearningActions';
import { analyzeTextHygiene } from '../../../lib/textQualityMetrics';
import type { AgentMode } from '../../../types';
import { buildAgentWorkspaceContext } from '../../../lib/agentWorkspaceContext';
import {
  selectNextBestAction,
  selectWeakConcepts,
  selectWorkspaceContext,
} from '../../../lib/workspaceSelectors';
import { createWorkspaceLiveSync } from '../../../lib/workspaceStoreSpine';
import { defaultEventConfidence } from '../../../lib/workspaceCorrelationEvents';
import { emitWorkspaceConceptEvent } from '../../../lib/emitLearningEvent';
import { buildConceptBusRows, buildToolActivityBreakdown } from '../../../lib/conceptBusPanelModel';
import type { ConceptRemediationId } from '../../../lib/conceptBusRemediation';
import { enrichWeakSpotsWithReasons } from '../../../lib/weakAreaReasons';
import { buildDashboardWeakSpots } from '../../../lib/dashboardWeakSpotsModel';
import {
  buildSectionAskAgentPrompt,
  buildToolDefaultAgentPrompt,
  resolveToolAgentMode,
  type ToolAgentIntent,
} from '../../../lib/workspaceToolAgentPrompts';
import { buildConceptLensView, type ConceptLensAction } from '../../../lib/conceptGraphModel';
import { buildFeynmanSessionContent } from '../../../lib/feynmanSessionModel';
import { buildCompareSessionContent } from '../../../lib/compareSessionModel';
import { buildDebateSessionContent } from '../../../lib/debateSessionModel';
import { buildLeitnerSessionContent } from '../../../lib/leitnerSessionModel';
import { buildSimulatorSessionContent } from '../../../lib/simulatorSessionModel';
import { buildWhiteboardSessionContent } from '../../../lib/whiteboardSessionModel';
import { buildTimerSessionContent } from '../../../lib/timerSessionModel';
import { buildDashboardSessionContent } from '../../../lib/dashboardSessionModel';
import {
  isTypingTarget,
  resolveWorkspaceShortcutKey,
  WORKSPACE_KEYBOARD_SHORTCUTS,
} from '../../../lib/workspaceKeyboardShortcuts';
import {
  fetchSharedAnnotations,
  publishTeacherAnnotation,
  isProxyConfigured,
  configuredProxyBase,
  type SharedAnnotationDto,
} from '../../../lib/authClient';
import type { StoredAnnotation } from '../../../lib/annotationStore';
import { preloadPrimaryWorkspaceTools, preloadWorkspaceToolChunks } from '../../../lib/preloadWorkspaceToolChunks';

import { useState, useRef, useCallback, useEffect, useMemo, useDeferredValue } from 'react';
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
  onSaveCourseExtractedText,
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
  const { t, lang } = useI18n();
  const progressKey = taskId ? `task:${taskId}` : `concept:${quizConcept}`;

  const [activeTool, setActiveTool] = useState<WorkspaceTool>(initialTool);
  // Initialize from current viewport so mobile users land directly on the lesson
  // panel instead of a crowded split layout where neither pane is usable.
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  const [layout, setLayout] = useState<LayoutMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'focus-lesson' : 'split',
  );
  const [currentStep, setCurrentStep] = useState(() => loadWorkspaceStep(progressKey));
  const [quizPassed, setQuizPassed] = useState(false);
  const [genStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const [lessonCollapsed, setLessonCollapsed] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
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

  useEffect(() => {
    preloadPrimaryWorkspaceTools();
    preloadWorkspaceToolChunks();
  }, []);

  const [sharedAnnotations, setSharedAnnotations] = useState<SharedAnnotationDto[]>([]);
  const [annotationSyncVersion, setAnnotationSyncVersion] = useState(0);
  const [annotationSyncLive, setAnnotationSyncLive] = useState(false);
  const [annotationSyncMode, setAnnotationSyncMode] = useState<AnnotationSyncMode>('poll');
  const [quizIrtRevision, setQuizIrtRevision] = useState(0);
  const [sandboxTopSensitivityCue, setSandboxTopSensitivityCue] = useState<string | undefined>();
  const [pendingExamPractice, setPendingExamPractice] = useState<ExamPracticePresetId | null>(null);
  /** Single open intelligence panel (tabs on all breakpoints). null = collapsed. */
  const [intelTab, setIntelTab] = useState<MobileIntelTab | null>(null);
  const [intelSheetOpen, setIntelSheetOpen] = useState(false);
  const [studyRoomOpen, setStudyRoomOpen] = useState(false);
  const [conceptLensExpanded, setConceptLensExpanded] = useState(false);
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

  // B5 — defer expensive workspace derivations while step/concept changes rapidly
  const deferredStep = useDeferredValue(currentStep);
  const deferredConcept = useDeferredValue(quizConcept);
  const deferredFocusTerm = useDeferredValue(effectiveFocus?.term ?? '');

  const noteBundleOpts = useMemo(
    () => ({
      uploadedFiles,
      glossaryEntries,
      courses,
      courseId,
      concept: deferredConcept,
      conceptBars,
      lang,
      learnerModel,
    }),
    [uploadedFiles, glossaryEntries, courses, courseId, deferredConcept, conceptBars, lang, learnerModel],
  );
  const noteBundle = useWorkspaceNoteBundle(noteBundleOpts);
  const sourceIntelligence = noteBundle.sourceIntelligence;

  /** Full source slice for annotations — stable across concept/focus changes (unlike reader excerpt). */
  const annotationStableSource = useMemo(() => {
    const full = noteBundle.sourceFullText?.trim();
    if (full) return full.slice(0, 16000);
    return noteBundle.annotationText;
  }, [noteBundle.sourceFullText, noteBundle.fileKey, noteBundle.annotationText]);

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
  const handleReuploadMaterial = useCallback(() => {
    const fn = onReuploadMaterial ?? onUpload;
    fn?.();
  }, [onReuploadMaterial, onUpload]);

  const reprocessCourse = useMemo(
    () => resolveReprocessCourse(courses, effectiveCourseId, uploadedFiles, courseName ?? linkedCourse?.title),
    [courses, effectiveCourseId, uploadedFiles, courseName, linkedCourse?.title],
  );
  const qualityBannerDecision = useMemo(() => {
    if (linkedCourse) {
      return shouldShowCourseQualityBanner({
        course: linkedCourse,
        uploadedFiles,
        hasReuploadHandler: Boolean(onReuploadMaterial ?? onUpload),
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

  const sourceTextHygiene = useMemo(() => {
    const fromCourse = linkedCourse?.sourceQuality?.metrics;
    if (fromCourse?.textHygieneScore != null || fromCourse?.textCorruptionScore != null) {
      return {
        hygieneScore: fromCourse.textHygieneScore,
        corruptionScore: fromCourse.textCorruptionScore,
        flags: fromCourse.textHygieneFlags ?? [],
      };
    }
    const sample = noteBundle.sourceFullText?.slice(0, 80_000) ?? '';
    if (sample.length < 80) return null;
    const report = analyzeTextHygiene(sample);
    return {
      hygieneScore: report.hygieneScore,
      corruptionScore: report.corruptionScore,
      flags: report.flags,
    };
  }, [linkedCourse?.sourceQuality?.metrics, noteBundle.sourceFullText]);

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
    if (!reprocessWizardOpen || !reprocessCourse) return null;
    return buildReprocessPreview(reprocessCourse, uploadedFiles, lang, quizConcept);
  }, [reprocessWizardOpen, reprocessCourse, uploadedFiles, lang, quizConcept]);

  const handleApplyReprocess = useCallback((editedText?: string) => {
    if (editedText && onSaveCourseExtractedText && effectiveCourseId) {
      onSaveCourseExtractedText(effectiveCourseId, editedText);
    }
    if (!onReprocessMaterial) return;
    const ok = onReprocessMaterial();
    if (ok !== false) setReprocessApplied(true);
  }, [onReprocessMaterial, onSaveCourseExtractedText, effectiveCourseId]);

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
    () => buildConceptBusRows(conceptBus, deferredFocusTerm || deferredConcept),
    [conceptBus, deferredFocusTerm, deferredConcept],
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

  const resolveEmptyActions = useCallback(
    (tool: WorkspaceEmptyTool) =>
      buildWorkspaceEmptyActions({
        tool,
        hasSource: noteBundle.hasSource,
        lang,
        onUpload: handleToolUpload,
        onReprocess: onReprocessMaterial ? openReprocessWizard : undefined,
        onSwitchTool: openWorkspaceTool,
      }),
    [noteBundle.hasSource, lang, handleToolUpload, onReprocessMaterial, openReprocessWizard, openWorkspaceTool],
  );

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
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile((prev) => {
        // Auto-correct stale split layout when crossing into mobile so the
        // lesson surface always wins (previous layout left both panes too
        // cramped to read or interact on phones).
        if (mobile && !prev) {
          setLayout((current) => (current === 'split' ? 'focus-lesson' : current));
        }
        return mobile;
      });
    };
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
      concept: deferredConcept,
      glossary: scopedGlossary,
      lang,
      sectionLabel: STEPS[deferredStep]?.title,
      hasSource: noteBundle.hasSource,
      spacingIntervals: learnerModel?.spacingIntervals ?? [],
      customCards: customLeitnerCards,
    }),
    [
      noteBundle.sourceFullText, noteBundle.hasSource, deferredConcept, scopedGlossary,
      lang, STEPS, deferredStep, learnerModel?.spacingIntervals, customLeitnerCards,
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
      if (layout === 'focus-lesson' || layout === 'focus-tool') {
        setLayout(isMobile ? 'focus-tool' : 'split');
      }
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
      count: 3,
    }),
    [
      noteBundle.hasSource, noteBundle.annotationText, quizConcept, scopedGlossary,
      lang, quizIrtState.ability, conceptMastery, STEPS, currentStep,
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
    if (base.length === 0 && quizConcept) {
      return [{ id: '1', label: quizConcept, type: 'concept' as const, x: 200, y: 150, mastery: 0 }];
    }
    return base;
  }, [noteBundle.conceptMap.nodes, quizConcept]);

  const conceptEdges = noteBundle.conceptMap.edges;

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
        id: 'toggle-study-room',
        label: el ? 'Ομαδική μελέτη' : 'Study together',
        group: el ? 'Συνεργασία' : 'Collaboration',
        run: () => setStudyRoomOpen((v) => !v),
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
  }, [lang, quizConcept, openWorkspaceTool, openReaderAtSearch, onReprocessMaterial, linkedCourse, showReuploadHint, showLowQualityBanner, openReprocessWizard, setStudyRoomOpen]);

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
        nextActions: [] as { label: string; type: string; minutes: number; xp: number; taskId?: string }[],
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

  useEffect(() => {
    if (isMobile) setConceptLensExpanded(false);
  }, [isMobile]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const resolved = resolveWorkspaceShortcutKey(e);
      if (!resolved) return;

      const def = WORKSPACE_KEYBOARD_SHORTCUTS.find((s) => s.id === resolved.action);
      const allowWhileTyping = def?.allowWhileTyping ?? false;
      if (!allowWhileTyping && isTypingTarget(e.target)) return;

      switch (resolved.action) {
        case 'close-overlay':
          e.preventDefault();
          if (showShortcutHelp) setShowShortcutHelp(false);
          else if (showPalette) setShowPalette(false);
          else if (showNotes) setShowNotes(false);
          else if (mobileToolDrawerOpen) setMobileToolDrawerOpen(false);
          else if (reprocessWizardOpen) setReprocessWizardOpen(false);
          else onClose();
          break;
        case 'open-palette':
          e.preventDefault();
          setShowPalette(true);
          break;
        case 'toggle-help':
          e.preventDefault();
          setShowShortcutHelp((v) => !v);
          break;
        case 'prev-step':
          e.preventDefault();
          if (currentStep > 0) selectWorkspaceStep(currentStep - 1, { focusReader: true });
          break;
        case 'next-step':
          e.preventDefault();
          if (currentStep < STEPS.length - 1) selectWorkspaceStep(currentStep + 1, { focusReader: true });
          break;
        case 'tool-index': {
          e.preventDefault();
          const tool = AVAILABLE_TOOLS[resolved.toolIndex ?? 0];
          if (tool) openWorkspaceTool(tool);
          break;
        }
        case 'layout-lesson':
          e.preventDefault();
          setLayout('focus-lesson');
          break;
        case 'layout-tool':
          e.preventDefault();
          setLayout('focus-tool');
          break;
        case 'layout-split':
          e.preventDefault();
          setLayout(isMobile ? 'focus-tool' : 'split');
          break;
        case 'toggle-notes':
          e.preventDefault();
          setShowNotes((v) => !v);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    showShortcutHelp, showPalette, showNotes, mobileToolDrawerOpen, reprocessWizardOpen,
    onClose, currentStep, STEPS.length, selectWorkspaceStep, openWorkspaceTool, isMobile,
  ]);

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
    onSaveCourseExtractedText,
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
    studyRoomOpen,
    setStudyRoomOpen,
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
    deferredFocusTerm,
    noteBundle,
    annotationStableSource,
    sourceIntelligence,
    toolEmptyMessage,
    handleToolUpload,
    resolveEmptyActions,
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
    sourceHighlight,
    learnerModel,
    setSandboxTopSensitivityCue,
    annotationSyncVersion,
  };
}

export type StudyWorkspaceModel = ReturnType<typeof useStudyWorkspace>;
