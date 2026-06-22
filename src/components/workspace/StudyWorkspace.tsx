import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  X, Maximize2, Minimize2, ChevronRight, Sparkles, PanelLeftClose, PanelLeftOpen, StickyNote,
  Aperture, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { WorkspaceDock } from './WorkspaceDock';
import { SourceIntelligenceCard } from './SourceIntelligenceCard';
import { LessonContent } from './LessonContent';
import { DraggableConceptMap } from './DraggableConceptMap';
import { AnnotationOverlay } from './AnnotationOverlay';
import { FormulaScratchpad } from './FormulaScratchpad';
import { MiniDashboard } from './MiniDashboard';
import { LeitnerBox } from './LeitnerBox';
import { StudyTimer } from './StudyTimer';
import { InteractiveSimulator } from './InteractiveSimulator';
import { ArgumentMap } from './ArgumentMap';
import { CognitiveReader } from './CognitiveReader';
import { StudyWhiteboard } from './StudyWhiteboard';
import { FeynmanCheck } from './FeynmanCheck';
import { ComparisonTable } from '../visuals/DiagramGenerator';
import { WorkspaceQuizSession } from './WorkspaceQuizSession';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { CommandPalette, type CommandItem } from './CommandPalette';
import { buildWorkspaceNoteBundle } from '../../lib/workspaceNoteContent';
import { loadWorkspaceStep, saveWorkspaceStep, saveConceptMapPositions, loadWorkspaceNotes, saveWorkspaceNotes, loadConceptBus, saveConceptBus, loadAllConceptBuses } from '../../lib/workspacePersistence';
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
  recordConceptActivity,
  conceptEngagement,
  isStruggling,
  isConfident,
  activityFor,
  type ConceptBusState,
  type ConceptSignal,
  type ConceptActivity,
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
import { loadExamTarget } from '../../lib/workspacePersistence';
import { buildAdaptiveQuizFromNotes } from '../../lib/noteContentExtractors';
import {
  buildQuizIrtDisplay,
  loadQuizIrt,
  recordQuizResponse,
  targetQuizDifficulty,
} from '../../lib/quizIrt';
import { buildDiscoverabilitySummary } from '../../lib/workspaceDiscoverability';
import { buildQuizSession } from '../../lib/quizSession';
import { WorkspaceDiscoverabilityPanel } from './WorkspaceDiscoverabilityPanel';
import {
  fetchSharedAnnotations,
  publishTeacherAnnotation,
  type SharedAnnotationDto,
} from '../../lib/authClient';
import type { StoredAnnotation } from '../../lib/annotationStore';

type WorkspaceTool = WorkspaceToolId;
type LayoutMode = 'split' | 'focus-lesson' | 'focus-tool' | 'zen';

interface Props {
  onClose: () => void;
  onOpenAgent: () => void;
  onComplete?: () => void;
  taskTitle?: string;
  courseName?: string;
  quizConcept?: string;
  xpReward?: number;
  initialTool?: WorkspaceTool;
  taskId?: string | null;
  learnerModel?: LearnerModel;
  dashboardStats?: { streak: number; reviewsDue: number };
  conceptBars?: { concept: string; mastery: number }[];
  uploadedFiles?: UploadedFile[];
  glossaryEntries?: GlossaryEntry[];
  courses?: Course[];
  courseId?: string;
  onUpload?: () => void;
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
  setWorkspaceFocus?: (f: WorkspaceFocus) => void;
}

const AVAILABLE_TOOLS: WorkspaceTool[] = [
  'reader', 'concept-map', 'scratchpad', 'whiteboard', 'leitner',
  'feynman', 'quiz', 'simulator', 'compare', 'debate', 'timer', 'annotations', 'dashboard'
];

export function StudyWorkspace({
  onClose,
  onOpenAgent,
  onComplete,
  taskTitle,
  courseName,
  quizConcept = 'Economics',
  initialTool = 'reader',
  taskId,
  learnerModel,
  dashboardStats = { streak: 0, reviewsDue: 0 },
  conceptBars = [],
  uploadedFiles = [],
  glossaryEntries = [],
  courses = [],
  courseId,
  onUpload,
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
  const [sharedAnnotations, setSharedAnnotations] = useState<SharedAnnotationDto[]>([]);
  const [annotationSyncVersion, setAnnotationSyncVersion] = useState(0);
  const [annotationSyncLive, setAnnotationSyncLive] = useState(false);
  const [annotationSyncMode, setAnnotationSyncMode] = useState<AnnotationSyncMode>('poll');
  const [quizIrtRevision, setQuizIrtRevision] = useState(0);
  const [sandboxTopSensitivityCue, setSandboxTopSensitivityCue] = useState<string | undefined>();
  const [discoverabilityOpen, setDiscoverabilityOpen] = useState(true);
  
  const lastAnnotationSyncRef = useRef<string | null>(null);

  const [conceptBus, setConceptBus] = useState<ConceptBusState>(
    () => loadConceptBus<ConceptBusState>(progressKey) ?? {},
  );

  // Persist cross-tool concept engagement so interconnection survives sessions.
  useEffect(() => {
    saveConceptBus(progressKey, conceptBus);
  }, [progressKey, conceptBus]);

  /** Report a real cross-tool concept interaction to the shared session bus. */
  const noteConceptActivity = useCallback(
    (concept: string | undefined, tool: WorkspaceTool, signal: ConceptSignal) => {
      const label = concept?.trim();
      if (!label) return;
      setConceptBus((prev) => recordConceptActivity(prev, label, tool, signal));
    },
    [],
  );

  const internalSetFocus = useCallback((f: WorkspaceFocus) => {
    if (setWorkspaceFocus) setWorkspaceFocus(f);
    if (f.term && f.originTool) {
      noteConceptActivity(f.term, f.originTool as WorkspaceTool, 'focus');
    }
  }, [setWorkspaceFocus, noteConceptActivity]);

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

  const linkedCourse = useMemo(
    () => courses.find((c) => c.id === (courseId ?? uploadedFiles.find((f) => f.courseId)?.courseId)),
    [courses, courseId, uploadedFiles],
  );
  const effectiveCourseId = courseId ?? linkedCourse?.id ?? uploadedFiles.find((f) => f.courseId)?.courseId;

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

  const leitnerDueCount = useMemo(() => {
    if (!noteBundle.hasSource || noteBundle.leitnerCards.length === 0) return 0;
    return orderDeckByDueQueue(
      noteBundle.leitnerCards,
      learnerModel?.spacingIntervals ?? [],
      quizConcept,
    ).dueCount;
  }, [noteBundle.leitnerCards, noteBundle.hasSource, learnerModel?.spacingIntervals, quizConcept]);

  const timerExamTarget = useMemo(
    () => loadExamTarget(progressKey),
    [progressKey],
  );

  const pullSharedAnnotations = useCallback(async (since?: string) => {
    if (!userSettings || !effectiveCourseId || !noteBundle.fileKey || noteBundle.fileKey === 'no-source') {
      setSharedAnnotations([]);
      setAnnotationSyncLive(false);
      return;
    }
    const result = await fetchSharedAnnotations(userSettings, effectiveCourseId, noteBundle.fileKey, { since });
    if (since && result.annotations.length > 0) {
      setSharedAnnotations((prev) => mergeSharedAnnotations(prev, result.annotations));
    } else if (!since) {
      setSharedAnnotations(result.annotations);
    }
    setAnnotationSyncVersion(result.version);
    lastAnnotationSyncRef.current = result.serverTime;
    setAnnotationSyncLive(Boolean(userSettings.llmProxyUrl || userSettings.authProxyBase));
  }, [userSettings, effectiveCourseId, noteBundle.fileKey]);

  useEffect(() => {
    void pullSharedAnnotations();
  }, [pullSharedAnnotations]);

  useEffect(() => {
    const base = userSettings?.authProxyBase || userSettings?.llmProxyUrl;
    if (!base || !effectiveCourseId || !noteBundle.fileKey || noteBundle.fileKey === 'no-source') return;
    const disconnect = connectAnnotationStream(
      base,
      effectiveCourseId,
      noteBundle.fileKey,
      (payload) => {
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
  }, [userSettings, effectiveCourseId, noteBundle.fileKey]);

  useEffect(() => {
    if (annotationSyncMode !== 'poll') return;
    if (!userSettings || !effectiveCourseId || noteBundle.fileKey === 'no-source') return;
    const id = window.setInterval(() => {
      void pullSharedAnnotations(lastAnnotationSyncRef.current ?? undefined);
    }, DEFAULT_ANNOTATION_POLL_MS);
    return () => window.clearInterval(id);
  }, [annotationSyncMode, pullSharedAnnotations, userSettings, effectiveCourseId, noteBundle.fileKey]);

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
        type: lang === 'el' ? 'Αρχική' : 'Intro'
      }];
    }
    return [
      ...(noteBundle.workspaceSteps ?? []),
    ];
  }, [noteBundle, lang]);

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
    saveWorkspaceStep(progressKey, currentStep);
  }, [progressKey, currentStep]);

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
      focusTerm: workspaceFocus?.term,
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
    [progressKey, quizConcept, conceptMastery, effectiveCourseId, workspaceFocus?.term, currentStep, STEPS, scopedGlossary.length, noteBundle.compareRows.length, dueStepIndices, annotationSyncVersion, leitnerDueCount, timerExamTarget, quizIrtState.ability, sandboxTopSensitivityCue],
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

  const quizSessionItems = useMemo(() => {
    if (!noteBundle.hasSource) return [];
    return buildQuizSession(
      noteBundle.annotationText,
      quizConcept,
      scopedGlossary,
      lang,
      quizIrtState.ability,
      conceptMastery,
      3,
    );
  }, [noteBundle.hasSource, noteBundle.annotationText, quizConcept, scopedGlossary, lang, quizIrtState.ability, conceptMastery]);

  const discoverabilitySummary = useMemo(
    () => buildDiscoverabilitySummary(
      noteBundle.hasSource,
      sourceIntelligence,
      workspaceCorrelation,
      activeTool,
      lang,
    ),
    [noteBundle.hasSource, sourceIntelligence, workspaceCorrelation, activeTool, lang],
  );

  const discoverabilityActions = useMemo(() => ({
    'open-reader-focus': () => openReaderForTerm(workspaceFocus?.term ?? quizConcept, 'reader'),
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
  }), [workspaceFocus?.term, quizConcept, openReaderForTerm, layout, isMobile, STEPS.length, dueStepIndices]);

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

  const paletteItems = useMemo<CommandItem[]>(() => {
    const el = lang === 'el';
    const toolItems: CommandItem[] = AVAILABLE_TOOLS.map((tool) => ({
      id: `tool-${tool}`,
      label: `${el ? 'Άνοιγμα' : 'Open'}: ${tool}`,
      group: el ? 'Εργαλεία' : 'Tools',
      run: () => openWorkspaceTool(tool),
    }));
    return [
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
  }, [lang, quizConcept, openWorkspaceTool, openReaderAtSearch]);

  useEffect(() => {
    if (layout === 'zen') {
      setChromeHidden(true);
      setLessonCollapsed(true);
    } else {
      setChromeHidden(false);
      setLessonCollapsed(false);
    }
  }, [layout]);

  const handleStepNext = () => {
    const onQuizStep = currentStep === STEPS.length - 1;
    if (onQuizStep && !quizPassed) return;
    recordStepVisit(progressKey, currentStep, conceptMastery);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-surface-primary flex flex-col blueprint-canvas blueprint-grid"
      data-testid="study-workspace"
      data-grounded={noteBundle.hasSource ? 'true' : 'false'}
    >
      {/* Top bar */}
      {!chromeHidden && (
        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 border-b border-white/8 bg-surface-secondary/70 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold truncate text-text-primary">
                  {taskTitle ?? quizConcept}
                </h1>
                {courseName && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] font-medium text-text-muted shrink-0 truncate max-w-[120px]">
                    {courseName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {layout !== 'zen' && (
              <button
                type="button"
                onClick={() => setShowPalette(true)}
                title={lang === 'el' ? 'Παλέτα εντολών (⌘K)' : 'Command palette (⌘K)'}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-mono text-text-secondary shrink-0"
              >
                ⌘K
              </button>
            )}
            <button onClick={() => setShowNotes((v) => !v)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-secondary shrink-0" title={lang === 'el' ? 'Σημειώσεις' : 'Session notes'}>
              <StickyNote className={cn('w-4 h-4', showNotes && 'text-accent-cyan')} />
            </button>
            <button onClick={() => setLayout(layout === 'zen' ? 'split' : 'zen')} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-secondary shrink-0" title={layout === 'zen' ? 'Exit focus (Z)' : 'Toggle layout (S)'}>
              {layout === 'zen' ? <Minimize2 className="w-4 h-4 text-accent-cyan" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button onClick={onOpenAgent} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium border border-white/10 bg-white/[0.04] hover:border-accent-cyan/40 hover:bg-white/[0.08] text-text-secondary shrink-0 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" /> {t('agentBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Progress mini-bar */}
      <div className="relative z-10 h-0.5 bg-white/5 shrink-0">
        <div className="h-0.5 bg-gradient-to-r from-accent-cyan to-brand-400 transition-all duration-500" style={{ width: `${Math.max(5, ((currentStep + 1) / STEPS.length) * 100)}%` }} />
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Tool Dock (Left Sidebar) */}
        {!chromeHidden && !isMobile && (
          <WorkspaceDock 
            activeTool={activeTool} 
            onSelectTool={openWorkspaceTool} 
            availableTools={AVAILABLE_TOOLS} 
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
                    <button key={i} onClick={() => setCurrentStep(i)}
                      className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0 transition-all',
                        currentStep === i ? 'bg-accent-cyan/15 text-accent-cyan' : i < currentStep ? 'text-accent-emerald hover:bg-surface-hover' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover')}>
                      <span className={cn('w-4 h-4 rounded-full border text-[8px] flex items-center justify-center',
                        currentStep === i ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10' : i < currentStep ? 'border-accent-emerald text-accent-emerald bg-accent-emerald/10' : 'border-text-muted/30')}>
                        {i < currentStep ? '✓' : i + 1}
                      </span>
                      <span className="hidden sm:inline">{s.title.length > 16 ? s.title.slice(0, 14) + '…' : s.title}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 relative">
                {sourceIntelligence && !chromeHidden && (
                  <SourceIntelligenceCard
                    report={sourceIntelligence}
                    toolLabel={activeTool}
                    onOpenRecommendedTool={() => {
                      setActiveTool(sourceIntelligence.bestTool as WorkspaceTool);
                      if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
                    }}
                  />
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
                    onOpenAgent={onOpenAgent}
                    quizDef={quizDef}
                    quizPassed={quizPassed}
                    genStatus={genStatus}
                    noteExcerpt={noteBundle.readerText}
                    hasSource={noteBundle.hasSource}
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={onUpload}
                    onQuizComplete={(correct: boolean) => {
                      setQuizPassed(correct);
                      if (noteBundle.hasSource) {
                        recordQuizResponse(progressKey, quizConcept, quizDef, correct, conceptMastery);
                        setQuizIrtRevision((v) => v + 1);
                      }
                    }}
                    quizIrt={quizIrtDisplay}
                    quizSessionItems={quizSessionItems}
                    quizSessionScopeKey={progressKey}
                    t={t as any}
                    lang={lang}
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
              {/* Tool surface */}
              <div className="flex-1 relative overflow-hidden bg-surface-primary/50">
                <WorkspaceDiscoverabilityPanel
                  summary={discoverabilitySummary}
                  lang={lang}
                  expanded={discoverabilityOpen}
                  onToggle={() => setDiscoverabilityOpen((v) => !v)}
                  actions={discoverabilityActions}
                  onOpenRecommendedTool={
                    sourceIntelligence
                      ? () => setActiveTool(sourceIntelligence.bestTool as WorkspaceTool)
                      : undefined
                  }
                />

                <ConceptLensBar
                  concept={workspaceFocus?.term ?? quizConcept}
                  activity={activityFor(conceptBus, workspaceFocus?.term ?? quizConcept)}
                  activeTool={activeTool}
                  onJump={(tool) => openWorkspaceTool(tool)}
                  onFocus={(term) => focusOnTerm(term, activeTool)}
                  lang={lang}
                />

                {activeTool === 'concept-map' && (
                  <DraggableConceptMap
                    initialNodes={conceptNodes}
                    initialEdges={conceptEdges}
                    onNodeUpdate={(nodes) => saveConceptMapPositions(nodes, progressKey)}
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={onUpload}
                    focusConcept={workspaceFocus?.term}
                    onFocusTerm={(term) => {
                      noteConceptActivity(term, 'concept-map', 'mapped');
                      openReaderForTerm(term, 'concept-map');
                    }}
                    cursorSync={layout === 'split' ? conceptMapCursorSync : undefined}
                  />
                )}
                {activeTool === 'reader' && (
                  <CognitiveReader
                    text={readerText}
                    highlight={mergeReaderHighlight(sourceHighlight, workspaceFocus ?? {})}
                    focusTerm={workspaceFocus?.term}
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
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={onUpload}
                  />
                )}
                {activeTool === 'scratchpad' && (
                  <FormulaScratchpad
                    noteFormulas={noteBundle.formulas}
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={onUpload}
                    scopeKey={progressKey}
                    onSendToWhiteboard={sendScratchpadToWhiteboard}
                    lang={lang}
                  />
                )}
                {activeTool === 'whiteboard' && (
                  <StudyWhiteboard
                    referenceFormulas={noteBundle.formulas}
                    referenceExcerpt={noteBundle.hasSource ? noteBundle.readerText.slice(0, 400) : undefined}
                    scopeKey={progressKey}
                    scratchpadImport={scratchpadImport}
                    onDismissScratchpadImport={() => setScratchpadImport(null)}
                    onEngage={() => noteConceptActivity(quizConcept, 'whiteboard', 'noted')}
                    lang={lang}
                  />
                )}
                {activeTool === 'dashboard' && (
                  learnerModel ? (
                    <MiniDashboard
                      {...buildMiniDashboardProps(learnerModel, dashboardStats, tasks, onStartTask, courseName, {
                        conceptInsights: conceptBusInsights,
                        extraReviewsDue: spacedStepsDue,
                      })}
                    />
                  ) : (
                    <MiniDashboard
                      readiness={Math.round(conceptMastery)}
                      streak={dashboardStats.streak}
                      reviewsDue={dashboardStats.reviewsDue}
                      weakSpots={[]}
                      nextActions={[]}
                      conceptsMastered={0}
                      totalConcepts={0}
                    />
                  )
                )}
                {activeTool === 'leitner' && (
                  <LeitnerBox
                    concept={quizConcept}
                    cards={noteBundle.leitnerCards}
                    scopeKey={progressKey}
                    spacingIntervals={learnerModel?.spacingIntervals ?? []}
                    onRate={(rating) => {
                      onLeitnerRate?.(quizConcept, rating);
                      noteConceptActivity(quizConcept, 'leitner', rating === 'again' || rating === 'hard' ? 'leitner-hard' : 'leitner-easy');
                    }}
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={onUpload}
                  />
                )}
                {activeTool === 'timer' && (
                  <StudyTimer
                    concept={quizConcept}
                    stepLabel={STEPS[currentStep]?.title}
                    stepIndex={currentStep}
                    scopeKey={progressKey}
                    conceptMastery={workspaceCorrelation.conceptMastery}
                    onSessionComplete={(minutes, label) => onLogStudyMinutes?.(minutes, label)}
                  />
                )}
                {activeTool === 'simulator' && (
                  <InteractiveSimulator
                    concept={quizConcept}
                    economicsMode={noteBundle.economicsSandbox}
                    insight={noteBundle.sandboxInsight}
                    numericCues={noteBundle.numericCues}
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={onUpload}
                    lang={lang}
                    onSensitivityCue={(cueId) => {
                      setSandboxTopSensitivityCue(cueId);
                      noteConceptActivity(quizConcept, 'simulator', 'simulated');
                    }}
                  />
                )}
                {activeTool === 'compare' && (
                  <div className="p-4 overflow-y-auto h-full">
                    {noteBundle.compareRows.length > 0 ? (
                      <ComparisonTable
                        title={`${lang === 'el' ? 'Σύγκριση' : 'Compare'}: ${quizConcept}`}
                        headers={['Dimension', lang === 'el' ? 'Α' : 'A', lang === 'el' ? 'Β' : 'B']}
                        items={noteBundle.compareRows}
                        concept={quizConcept}
                        lang={lang}
                        onRowFocus={(term) => {
                          noteConceptActivity(term, 'compare', 'read');
                          focusOnTerm(term, 'compare');
                        }}
                      />
                    ) : (
                      <WorkspaceEmptyState message={noteBundle.emptyMessage} onUpload={onUpload} />
                    )}
                  </div>
                )}
                {activeTool === 'debate' && (
                  <ArgumentMap
                    tree={noteBundle.debateTree}
                    concept={quizConcept}
                    storageKey={`debate-${progressKey}`}
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={onUpload}
                    sourceText={noteBundle.hasSource ? noteBundle.readerText.slice(0, 2500) : undefined}
                    focusTerm={workspaceFocus?.term}
                    lang={lang}
                    onOpenInReader={(claim) => {
                      noteConceptActivity(quizConcept, 'debate', 'mapped');
                      openReaderAtSearch(claim, 'debate');
                    }}
                  />
                )}
                {activeTool === 'feynman' && (
                  <FeynmanCheck
                    concept={quizConcept}
                    settings={userSettings}
                    onOpenAgent={onOpenAgent}
                    outline={noteBundle.feynmanOutline}
                    placeholder={noteBundle.feynmanPlaceholder}
                    gapHints={noteBundle.feynmanGaps}
                    gapTerms={noteBundle.feynmanGapTerms}
                    referenceNotes={noteBundle.hasSource ? noteBundle.readerText.slice(0, 2500) : undefined}
                    glossary={scopedGlossary}
                    extraTerms={noteBundle.matchingTopic?.title ? [noteBundle.matchingTopic.title] : undefined}
                    onFocusConcept={() => {
                      noteConceptActivity(quizConcept, 'feynman', 'explained');
                      openWorkspaceTool('concept-map');
                    }}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'feynman')}
                  />
                )}
                {activeTool === 'annotations' && (
                  <AnnotationOverlay
                    sourceText={noteBundle.annotationText}
                    sourceName={noteBundle.sourceName}
                    fileKey={noteBundle.fileKey}
                    emptyMessage={noteBundle.emptyMessage}
                    onUpload={onUpload}
                    onAskAgent={() => onOpenAgent()}
                    focusTerm={workspaceFocus?.term}
                    onOpenInReader={(query) => openReaderAtSearch(query, 'annotations')}
                    onAnnotate={(term) => noteConceptActivity(term ?? quizConcept, 'annotations', 'annotated')}
                    lang={lang}
                    sharedAnnotations={sharedAnnotations}
                    courseId={effectiveCourseId}
                    authToken={userSettings?.authToken}
                    onPublishShared={handlePublishAnnotation}
                    annotationSyncLive={annotationSyncLive}
                    annotationSyncVersion={annotationSyncVersion}
                    annotationSyncMode={annotationSyncMode}
                  />
                )}
                {activeTool === 'quiz' && (
                  <WorkspaceQuizSession
                    scopeKey={progressKey}
                    concept={quizConcept}
                    items={quizSessionItems}
                    irt={quizIrtDisplay}
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
                    lang={lang}
                  />
                )}
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
    </div>
  );
}

const LENS_TOOL_LABELS: Record<WorkspaceTool, { en: string; el: string }> = {
  reader: { en: 'Reader', el: 'Ανάγνωση' },
  'concept-map': { en: 'Map', el: 'Χάρτης' },
  scratchpad: { en: 'Scratch', el: 'Πρόχειρο' },
  whiteboard: { en: 'Board', el: 'Πίνακας' },
  leitner: { en: 'Cards', el: 'Κάρτες' },
  feynman: { en: 'Feynman', el: 'Feynman' },
  quiz: { en: 'Quiz', el: 'Κουίζ' },
  simulator: { en: 'Sim', el: 'Προσομ.' },
  compare: { en: 'Compare', el: 'Σύγκριση' },
  debate: { en: 'Debate', el: 'Επιχ/τα' },
  timer: { en: 'Timer', el: 'Χρόνος' },
  annotations: { en: 'Notes', el: 'Σχόλια' },
  dashboard: { en: 'Stats', el: 'Στατιστ.' },
};

/**
 * Concept Lens — a compact, always-visible cue that turns the workspace tools
 * into one connected study surface. It shows the concept currently in shared
 * focus, how broadly it has been studied across tools this session, whether the
 * learner is struggling/confident, and offers one-click jumps to the tools that
 * have already engaged it.
 */
function ConceptLensBar({
  concept,
  activity,
  activeTool,
  onJump,
  onFocus,
  lang,
}: {
  concept: string;
  activity?: ConceptActivity;
  activeTool: WorkspaceTool;
  onJump: (tool: WorkspaceTool) => void;
  onFocus: (term: string) => void;
  lang: 'el' | 'en';
}) {
  const label = concept?.trim();
  if (!label) return null;

  const engagement = activity ? conceptEngagement(activity) : 0;
  const filledDots = Math.max(activity ? 1 : 0, Math.round(engagement * 4));
  const struggling = activity ? isStruggling(activity) : false;
  const confident = activity ? isConfident(activity) : false;
  const tools = (activity?.tools ?? []).filter((tl) => tl !== activeTool);

  return (
    <div className="absolute top-2 right-3 z-20 flex items-center gap-2 max-w-[68%] rounded-full border border-white/10 bg-surface-secondary/85 backdrop-blur px-2.5 py-1 shadow-[0_8px_30px_rgba(2,6,23,0.45)]">
      <Aperture className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
      <button
        type="button"
        onClick={() => onFocus(label)}
        title={lang === 'el' ? 'Εστίαση σε όλα τα εργαλεία' : 'Focus across all tools'}
        className="text-[11px] font-semibold truncate max-w-[140px] text-text-primary hover:text-accent-cyan transition-colors"
      >
        {label}
      </button>

      <div className="flex items-center gap-0.5 shrink-0" title={`${Math.round(engagement * 100)}% ${lang === 'el' ? 'διασύνδεση' : 'cross-tool engagement'}`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn('w-1.5 h-1.5 rounded-full', i < filledDots ? 'bg-accent-cyan' : 'bg-white/15')}
          />
        ))}
      </div>

      {struggling && (
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-accent-amber/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-amber">
          <AlertTriangle className="w-2.5 h-2.5" /> {lang === 'el' ? 'Δυσκολία' : 'Struggling'}
        </span>
      )}
      {confident && !struggling && (
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-accent-emerald/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-emerald">
          <CheckCircle2 className="w-2.5 h-2.5" /> {lang === 'el' ? 'Σταθερό' : 'Confident'}
        </span>
      )}

      {tools.length > 0 ? (
        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          <span className="hidden md:inline text-[9px] text-text-muted">{lang === 'el' ? 'Μελετήθηκε:' : 'Studied in:'}</span>
          {tools.slice(0, 4).map((tl) => (
            <button
              key={tl}
              type="button"
              onClick={() => onJump(tl)}
              title={lang === 'el' ? `Άνοιγμα: ${LENS_TOOL_LABELS[tl].el}` : `Open ${LENS_TOOL_LABELS[tl].en}`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-secondary hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors"
            >
              {LENS_TOOL_LABELS[tl][lang]}
            </button>
          ))}
        </div>
      ) : (
        <span className="hidden md:inline border-l border-white/10 pl-2 text-[9px] text-text-muted">
          {lang === 'el' ? 'Όχι ακόμη σε άλλα εργαλεία' : 'Not yet studied elsewhere'}
        </span>
      )}
    </div>
  );
}

