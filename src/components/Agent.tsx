import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, BookOpen, Brain, GraduationCap, MessageSquare,
  Code, Lightbulb, AlertTriangle, Mic, ChevronDown,
  RotateCcw, Target, PenTool, Smile, Search, FileText,
  HelpCircle, Zap, Settings2, Layers, Check, X, Volume2, VolumeX
} from '@/lib/lucide-shim';
import type { AgentMessage, AgentMode, Course, UserSettings, UploadedFile, MessageCitation, SkillNode, Task, LearnerModel } from '../types';
import type { DashboardNextAction } from '../lib/dashboardNextAction';
import { cn } from '../utils/cn';
import { streamAgentReply, isLlmAvailable } from '../lib/llmClient';
import { buildSourceExcerpt, retrieveForQueryHybrid } from '../lib/sourceContext';
import { buildAgentChatHistory } from '../features/agent';
import {
  parseAgentCommand,
  buildNoAnswerHintPrompt,
  buildLowRetrievalClarification,
} from '../features/agent';
import { buildAgentRetrievalQuery, buildAgentContextSystemBlock, type AgentWorkspaceContext } from '../features/agent';
import { buildPathTryChips, type PathTryChip } from '../lib/pathFocus';
import { isMultiDocSynthesizeAction, runMultiDocSynthesize } from '../features/agent';
import { spanFromCitation } from '../lib/conceptProvenance';
import { applyAgentGroundingGate } from '../lib/grounding';
import { emitAnalyticsLearningEvent } from '../lib/emitLearningEvent';
import { formatCitation } from '../lib/rag';
import { GoToSourceButton } from './GoToSourceButton';
import { AgentContextBanner } from './AgentContextBanner';
import { AgentFlowRail } from './AgentFlowRail';
import { RichText } from './RichText';
import { getAgentContent, type AgentUiCopy, AGENT_MODE_VISUALS } from '../features/agent';
import { AgentModeCatalogGrid, AgentModeSidebar } from './agent/AgentModeSidebar';
import { useI18n } from '../lib/i18n';
import { PlatformSection } from './ui/primitives';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { TrustBadgeRow } from './ui/platformChrome';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';
import { entranceMotion, useMinimalTheme } from '../lib/useMinimalTheme';
import { AllCapsLabel } from './ui/AllCapsLabel';
import { startFeynmanVoiceInput } from '../lib/feynmanVoice';
import {
  applyCheckInPatch,
  buildSlotPrompt,
  buildWarmGreeting,
  checkInContextBlock,
  completionAck,
  isCheckInComplete,
  loadDailyCheckIn,
  markGreetingSent,
  missingRequiredSlots,
  nextMissingSlot,
  parseFreeTextForSlot,
  saveDailyCheckIn,
  skipSlot,
  type CheckInChip,
  type CheckInSlotId,
  type DailyCheckInAnswers,
  type DailyCheckInRecord,
} from '../lib/dailyLearningCheckIn';
import {
  isAgentTtsSupported,
  speakAgentText,
  stopAgentTts,
} from '../lib/agentTts';
import {
  launchAckSuffix,
  resolveCheckInLaunch,
  type CheckInLaunch,
} from '../lib/checkInLaunch';
import {
  extractStudySignals,
  looksLikeStudyRoutineUtterance,
} from '../lib/extractStudySignals';
import {
  silentCaptureAck,
  tasksFilterFromSignals,
  type TasksFilterPreset,
} from '../lib/studySignalsWriteBack';
import { buildCalendarCheckInHint } from '../lib/calendarCheckInHint';

interface AgentProps {
  messages: AgentMessage[];
  mode: AgentMode;
  courses: Course[];
  onSendMessage: (msg: AgentMessage) => void;
  onUpdateMessage: (id: string, patch: Partial<AgentMessage>) => void;
  onChangeMode: (mode: AgentMode) => void;
  activeTaskTitle?: string;
  activeTaskConcept?: string;
  xpReward?: number;
  onCompleteTask?: () => void;
  settings?: UserSettings;
  uploadedFiles?: UploadedFile[];
  onGoToSource?: (highlight: { fileId: string; charStart: number; charEnd: number }) => void;
  lang?: 'en' | 'el';
  draftPrompt?: string | null;
  onConsumeDraftPrompt?: () => void;
  autoSendDraft?: boolean;
  onConsumeAutoSend?: () => void;
  /** OPT-AI-C β€” pin a library file once when opening Agent from Library Ask. */
  initialPinnedFileId?: string | null;
  onConsumePinnedFileId?: () => void;
  workspaceContext?: AgentWorkspaceContext | null;
  /** Compact panel for workspace center column (NotebookLM chat). */
  embedded?: boolean;
  /** Focus the chat input when embedded (workspace open). */
  autoFocusInput?: boolean;
  /** Open the full-page Agent view (optional escape hatch). */
  onOpenFullPage?: () => void;
  onChangeSourceMode?: (mode: UserSettings['sourceMode']) => void;
  dashboardNextAction?: DashboardNextAction | null;
  weakAreas?: SkillNode[];
  /** Tasks β€” used for review-due hints in daily check-in. */
  tasks?: Task[];
  learnerPreferredSessionLength?: number;
  onApplyDailyCheckIn?: (patch: Partial<DailyCheckInAnswers>) => DailyCheckInRecord | void;
  /** Soft-start daily check-in when the Agent opens (default true on full page). */
  enableDailyCheckIn?: boolean;
  /** After check-in completes β€” auto-start matched task/session. */
  onLaunchFromCheckIn?: (launch: CheckInLaunch) => void;
  /** Write-back: open Tasks with a filter inferred from chat signals. */
  onTasksFilterFromSignals?: (filter: TasksFilterPreset) => void;
  /** Soft CTA after check-in β€” open Settings Google Calendar (does not sync by itself). */
  onOpenCalendarSync?: () => void;
}

/* OPT-K90 β€” mode icons use ink; soft washes / active brand carry identity */
const AGENT_MODE_META: { mode: AgentMode; icon: typeof Brain; color: string }[] = [
  { mode: 'socratic', icon: HelpCircle, color: 'text-text-secondary' },
  { mode: 'direct', icon: Lightbulb, color: 'text-text-secondary' },
  { mode: 'beginner', icon: Smile, color: 'text-text-secondary' },
  { mode: 'exam-coach', icon: GraduationCap, color: 'text-text-secondary' },
  { mode: 'deep-theory', icon: BookOpen, color: 'text-text-secondary' },
  { mode: 'practical', icon: Code, color: 'text-text-secondary' },
  { mode: 'error-diagnosis', icon: AlertTriangle, color: 'text-text-secondary' },
  { mode: 'feynman', icon: MessageSquare, color: 'text-text-secondary' },
  { mode: 'debate', icon: Target, color: 'text-text-secondary' },
  { mode: 'oral-exam', icon: Mic, color: 'text-text-secondary' },
  { mode: 'math-tutor', icon: Zap, color: 'text-text-secondary' },
  { mode: 'coding-tutor', icon: Code, color: 'text-text-secondary' },
  { mode: 'writing-coach', icon: PenTool, color: 'text-text-secondary' },
  { mode: 'memory-coach', icon: RotateCcw, color: 'text-text-secondary' },
  { mode: 'motivation', icon: Sparkles, color: 'text-text-secondary' },
];

/* OPT-K100 β€” markup debt: Agent/Reader/tools decorative brand type -> ink */
export function Agent({
  messages,
  mode,
  courses,
  onSendMessage,
  onUpdateMessage,
  onChangeMode,
  activeTaskTitle,
  activeTaskConcept,
  xpReward,
  onCompleteTask,
  settings,
  uploadedFiles = [],
  onGoToSource,
  lang = settings?.language ?? 'en',
  draftPrompt,
  onConsumeDraftPrompt,
  autoSendDraft,
  onConsumeAutoSend,
  initialPinnedFileId,
  onConsumePinnedFileId,
  workspaceContext,
  embedded = false,
  autoFocusInput = false,
  onOpenFullPage,
  onChangeSourceMode,
  dashboardNextAction = null,
  weakAreas = [],
  tasks = [],
  learnerPreferredSessionLength,
  onApplyDailyCheckIn,
  enableDailyCheckIn,
  onLaunchFromCheckIn,
  onTasksFilterFromSignals,
  onOpenCalendarSync,
}: AgentProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [showModes, setShowModes] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [attachSource, setAttachSource] = useState(true);
  const [pinnedFileId, setPinnedFileId] = useState<string | null>(null);
  const [showSourceSettings, setShowSourceSettings] = useState(false);
  // Wave M-X05 β€” embedded compact source picker popover (single control, no re-open of full page).
  const [showEmbeddedSource, setShowEmbeddedSource] = useState(false);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [activeCheckInSlot, setActiveCheckInSlot] = useState<CheckInSlotId | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const ttsEnabled = Boolean(settings?.agentTtsEnabled) && isAgentTtsSupported();
  const sourceSelectRef = useRef<HTMLSelectElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceStopRef = useRef<(() => void) | null>(null);
  const checkInBootstrappedRef = useRef(false);
  const llmReady = isLlmAvailable(settings);
  const checkInEnabled = enableDailyCheckIn ?? !embedded;

  const checkInCtx = useMemo(() => {
    const reviewDueCount = tasks.filter(
      (task) =>
        task.status !== 'completed'
        && (task.category === 'review' || Boolean(task.isSpacedRepetition)),
    ).length;
    return {
      lang,
      courses: courses.map((c) => ({ id: c.id, title: c.title })),
      tasks,
      learner: {
        weakAreas,
        preferredSessionLength: learnerPreferredSessionLength ?? 25,
        bestTimeOfDay: '',
      } satisfies Pick<LearnerModel, 'weakAreas' | 'preferredSessionLength' | 'bestTimeOfDay'>,
      reviewDueCount,
    };
  }, [lang, courses, tasks, weakAreas, learnerPreferredSessionLength]);

  const postCheckInPrompt = (slot: CheckInSlotId) => {
    const built = buildSlotPrompt(slot, checkInCtx);
    setActiveCheckInSlot(slot);
    onSendMessage({
      id: `checkin-${slot}-${Date.now()}`,
      role: 'agent',
      content: `${built.prompt}\n\n_${t('agentCheckInChipHint')}_`,
      timestamp: new Date().toISOString(),
      type: 'question',
      metadata: {
        sourceGrounded: false,
        enrichmentUsed: false,
        inferenceUsed: false,
        dailyCheckIn: true,
        checkInSlot: slot,
        suggestionChips: built.chips.map((c: CheckInChip) => ({
          id: c.id,
          label: c.label,
          value: c.value,
        })),
      },
    });
  };
  const agentContent = useMemo(() => getAgentContent(lang), [lang]);
  const agentModes = useMemo(
    () => AGENT_MODE_META.map((meta) => ({
      ...meta,
      label: agentContent.modes[meta.mode].label,
      desc: agentContent.modes[meta.mode].desc,
    })),
    [agentContent],
  );
  const { quickActions, contextualPrompts, ui, sourceModes } = agentContent;
  const pathTryChips = useMemo(
    () => buildPathTryChips(workspaceContext?.pathFocus, lang),
    [workspaceContext?.pathFocus, lang],
  );
  const contextualSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    for (const chip of pathTryChips) {
      if (suggestions.length >= 5) break;
      suggestions.push(chip.prompt);
    }
    if (dashboardNextAction) {
      suggestions.push(contextualPrompts.fromNextAction(dashboardNextAction.label, dashboardNextAction.reason));
    }
    if (activeTaskTitle) {
      suggestions.push(contextualPrompts.fromTask(activeTaskTitle));
    }
    const weakConcept = workspaceContext?.pathFocus?.concept
      ?? weakAreas[0]?.concept
      ?? dashboardNextAction?.concept;
    if (weakConcept && !pathTryChips.length) {
      suggestions.push(contextualPrompts.fromWeakArea(weakConcept));
    }
    for (const action of quickActions) {
      if (suggestions.length >= 5) break;
      if (!suggestions.includes(action)) suggestions.push(action);
    }
    return suggestions.slice(0, 5);
  }, [
    pathTryChips,
    dashboardNextAction,
    activeTaskTitle,
    weakAreas,
    quickActions,
    contextualPrompts,
    workspaceContext?.pathFocus?.concept,
  ]);
  const analyzedFiles = useMemo(
    () => uploadedFiles.filter((f) => f.status === 'analyzed' && f.extractedText?.trim()),
    [uploadedFiles],
  );
  const scopedFiles = useMemo(() => {
    if (pinnedFileId) return analyzedFiles.filter((f) => f.id === pinnedFileId);
    if (selectedSource !== 'all') return analyzedFiles.filter((f) => f.courseId === selectedSource);
    return analyzedFiles;
  }, [analyzedFiles, pinnedFileId, selectedSource]);
  const sourceExcerpt = attachSource
    ? buildSourceExcerpt(
        scopedFiles,
        workspaceContext?.concept ?? activeTaskConcept,
        workspaceContext?.courseId ?? (selectedSource === 'all' ? undefined : selectedSource),
      )
    : undefined;

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) {
      // Scroll the thread pane only β€” avoid scrollIntoView pulling ancestors under workspace chrome.
      thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!embedded || !autoFocusInput) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [embedded, autoFocusInput]);

  useEffect(() => () => {
    voiceStopRef.current?.();
    voiceStopRef.current = null;
    stopAgentTts();
  }, []);

  /** Auto-speak finished agent replies when TTS is enabled. */
  useEffect(() => {
    if (!ttsEnabled) return;
    const last = [...messages].reverse().find((m) => m.role === 'agent' && !m.isStreaming && m.content.trim());
    if (!last || last.id === lastSpokenIdRef.current) return;
    // Skip pure chip-prompt re-asks being rapid-fired during check-in? Still OK to hear.
    lastSpokenIdRef.current = last.id;
    setSpeakingMessageId(last.id);
    speakAgentText(last.content, lang, {
      onEnd: () => setSpeakingMessageId((id) => (id === last.id ? null : id)),
    });
  }, [messages, ttsEnabled, lang]);

  /** Soft daily check-in bootstrap β€” greeting + first closed question. */
  useEffect(() => {
    if (!checkInEnabled || checkInBootstrappedRef.current) return;
    if (draftPrompt?.trim()) return; // let draft / notification drive the first turn
    const record = loadDailyCheckIn();
    if (isCheckInComplete(record)) {
      checkInBootstrappedRef.current = true;
      return;
    }
    // Avoid re-greeting if the thread already has a check-in turn today.
    const already = messages.some((m) => m.metadata?.dailyCheckIn);
    if (already) {
      checkInBootstrappedRef.current = true;
      const lastSlot = [...messages].reverse().find((m) => m.metadata?.checkInSlot)?.metadata?.checkInSlot;
      if (lastSlot) setActiveCheckInSlot(lastSlot);
      return;
    }
    checkInBootstrappedRef.current = true;
    let next = record;
    if (!next.greetingSent) {
      onSendMessage({
        id: `checkin-greet-${Date.now()}`,
        role: 'agent',
        content: buildWarmGreeting(checkInCtx),
        timestamp: new Date().toISOString(),
        type: 'text',
        metadata: {
          sourceGrounded: false,
          enrichmentUsed: false,
          inferenceUsed: false,
          dailyCheckIn: true,
        },
      });
      next = markGreetingSent(next);
      saveDailyCheckIn(next);
    }
    const slot = nextMissingSlot(next) ?? 'openFeel';
    // Defer first question slightly so greeting renders first.
    const timer = window.setTimeout(() => postCheckInPrompt(slot), 120);
    return () => window.clearTimeout(timer);
    // Intentionally once on mount / when check-in becomes relevant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInEnabled]);

  const handleSendRef = useRef<(overrideText?: string) => Promise<void>>(async () => {});

  const advanceCheckInAfterAnswer = (record: DailyCheckInRecord) => {
    if (isCheckInComplete(record)) {
      setActiveCheckInSlot(null);
      const autoStart = settings?.autoStartAfterCheckIn !== false;
      const launch = resolveCheckInLaunch(record.answers, tasks);
      const calendarHint = buildCalendarCheckInHint(lang, record.answers);
      const content =
        completionAck(lang, record.answers, { autoStart })
        + (autoStart ? launchAckSuffix(lang, launch) : '')
        + (calendarHint.hasSignals && onOpenCalendarSync
          ? `\n\n${t('agentCalendarChatPlanOffer')}`
          : '');
      onSendMessage({
        id: `checkin-done-${Date.now()}`,
        role: 'agent',
        content,
        timestamp: new Date().toISOString(),
        type: 'feedback',
        metadata: {
          sourceGrounded: false,
          enrichmentUsed: false,
          inferenceUsed: false,
          dailyCheckIn: true,
          ...(calendarHint.hasSignals && onOpenCalendarSync
            ? {
                suggestionChips: [
                  {
                    id: 'calendar-chat-plan',
                    label: t('agentCalendarChatPlanChip'),
                    value: '__calendar_chat_plan__',
                  },
                  {
                    id: 'calendar-dismiss',
                    label: t('agentCalendarDismissChip'),
                    value: '__calendar_dismiss__',
                  },
                ],
              }
            : {}),
        },
      });
      if (autoStart && launch.kind !== 'none') {
        // Let the ack render, then launch without a second tap.
        window.setTimeout(() => onLaunchFromCheckIn?.(launch), 450);
      }
      return;
    }
    const slot = nextMissingSlot(record);
    if (slot) postCheckInPrompt(slot);
  };

  const handleToggleSpeakMessage = (message: AgentMessage) => {
    if (speakingMessageId === message.id) {
      stopAgentTts();
      setSpeakingMessageId(null);
      return;
    }
    if (!isAgentTtsSupported()) return;
    setSpeakingMessageId(message.id);
    lastSpokenIdRef.current = message.id;
    speakAgentText(message.content, lang, {
      onEnd: () => setSpeakingMessageId((id) => (id === message.id ? null : id)),
    });
  };

  const resolveCheckInReply = (
    rawText: string,
    chipPatch?: Partial<DailyCheckInAnswers>,
  ): DailyCheckInRecord | null => {
    if (!checkInEnabled) return null;
    const record = loadDailyCheckIn();
    if (isCheckInComplete(record) && !activeCheckInSlot) return null;

    const slot =
      activeCheckInSlot
      ?? [...messages].reverse().find((m) => m.metadata?.checkInSlot)?.metadata?.checkInSlot
      ?? nextMissingSlot(record);
    if (!slot) return null;

    const skipRe = lang === 'el'
      ? /Ο€Ξ±ΟΞ¬Ξ»ΞµΞΉΟΞ·|Ξ¬ΟƒΟ„ΞΏ|Ξ±ΟΞ³ΟΟ„ΞµΟΞ±|skip/i
      : /skip|later|not now|pass/i;
    if (skipRe.test(rawText)) {
      const next = skipSlot(record, slot);
      saveDailyCheckIn(next);
      onApplyDailyCheckIn?.({});
      return next;
    }

    const built = buildSlotPrompt(slot, checkInCtx);
    const matchedChip = built.chips.find(
      (c) => c.value === rawText || c.label === rawText || rawText.includes(c.value),
    );
    const patch =
      chipPatch
      ?? matchedChip?.patch
      ?? parseFreeTextForSlot(slot, rawText, checkInCtx);

    if (!patch || Object.keys(patch).length === 0) {
      if (slot === 'openFeel') {
        const openPatch = { openFeel: rawText.slice(0, 240) };
        const fromStore = onApplyDailyCheckIn?.(openPatch);
        if (fromStore) return fromStore;
        const applied = applyCheckInPatch(markGreetingSent(record), openPatch);
        saveDailyCheckIn(applied);
        return applied;
      }
      return null;
    }

    const fromStore = onApplyDailyCheckIn?.(patch);
    if (fromStore) return fromStore;
    const applied = applyCheckInPatch(record, patch);
    saveDailyCheckIn(applied);
    return applied;
  };

  const handleSend = async (overrideText?: string, chipPatch?: Partial<DailyCheckInAnswers>) => {
    const rawText = (overrideText ?? input).trim();
    if (!rawText || isThinking) return;

    // Wave AI-K β€” passive multi-slot extract from every casual utterance.
    const extraction = chipPatch && Object.keys(chipPatch).length > 0
      ? {
          patch: chipPatch,
          filledSlots: Object.keys(chipPatch) as CheckInSlotId[],
          source: 'heuristic' as const,
        }
      : await extractStudySignals(rawText, checkInCtx, settings);

    if (Object.keys(extraction.patch).length > 0) {
      onApplyDailyCheckIn?.(extraction.patch);
      const filter = tasksFilterFromSignals(extraction.patch);
      if (filter) onTasksFilterFromSignals?.(filter);
    }

    const afterExtract = loadDailyCheckIn();
    const inCheckInFlow =
      checkInEnabled
      && (Boolean(activeCheckInSlot) || !isCheckInComplete(afterExtract) || Boolean(chipPatch));

    // Active / incomplete check-in: multi-slot merge already applied β€” advance or ask gaps only.
    if (inCheckInFlow && (chipPatch || extraction.filledSlots.length > 0 || activeCheckInSlot)) {
      // Keep slot-skip / openFeel edge cases via resolver when extract was empty.
      if (!extraction.filledSlots.length && !chipPatch) {
        const checkInNext = resolveCheckInReply(rawText, chipPatch);
        if (checkInNext) {
          onSendMessage({
            id: `msg-${Date.now()}`,
            role: 'user',
            content: rawText,
            timestamp: new Date().toISOString(),
            type: 'text',
          });
          setInput('');
          setShowQuickActions(false);
          emitAnalyticsLearningEvent('agent_message', { isHint: false, command: '' });
          advanceCheckInAfterAnswer(checkInNext);
          return;
        }
      } else {
        onSendMessage({
          id: `msg-${Date.now()}`,
          role: 'user',
          content: rawText,
          timestamp: new Date().toISOString(),
          type: 'text',
        });
        setInput('');
        setShowQuickActions(false);
        emitAnalyticsLearningEvent('agent_message', { isHint: false, command: '' });
        advanceCheckInAfterAnswer(loadDailyCheckIn());
        return;
      }
    }

    // Pure routine utterance outside formal check-in β€” silent consistency, no RAG.
    const academicAsk = /what is|Ο„ΞΉ ΞµΞ―Ξ½Ξ±ΞΉ|explain|ΞµΞΎΞ®Ξ³Ξ·Οƒ|how does|Ο€ΟΟ‚ Ξ»ΞµΞΉΟ„ΞΏΟ…ΟΞ³|why |Ξ³ΞΉΞ±Ο„Ξ― /i.test(rawText);
    if (
      !academicAsk
      && looksLikeStudyRoutineUtterance(rawText)
      && extraction.filledSlots.length >= 1
    ) {
      onSendMessage({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: rawText,
        timestamp: new Date().toISOString(),
        type: 'text',
      });
      setInput('');
      setShowQuickActions(false);
      emitAnalyticsLearningEvent('agent_message', { isHint: false, command: '' });
      const ack = silentCaptureAck(lang, extraction.filledSlots, extraction.patch)
        ?? (lang === 'el'
          ? 'Ξ¤ΞΏ ΞΊΟΞ¬Ο„Ξ·ΟƒΞ± β€” ΟƒΟ…Ξ½ΞµΟ‡Ξ―Ξ¶ΞΏΟ…ΞΌΞµ Ξ®ΟƒΟ…Ο‡Ξ± Ξ±Ο€Ο ΞµΞΊΞµΞ―.'
          : "Got it β€” we'll quietly go from there.");
      onSendMessage({
        id: `msg-${Date.now() + 1}`,
        role: 'agent',
        content: ack,
        timestamp: new Date().toISOString(),
        type: 'feedback',
        metadata: {
          sourceGrounded: false,
          enrichmentUsed: false,
          inferenceUsed: false,
          dailyCheckIn: true,
        },
      });
      const stillMissing = missingRequiredSlots(loadDailyCheckIn());
      if (checkInEnabled && stillMissing[0]) {
        window.setTimeout(() => postCheckInPrompt(stillMissing[0]!), 100);
      } else if (checkInEnabled && isCheckInComplete(loadDailyCheckIn())) {
        advanceCheckInAfterAnswer(loadDailyCheckIn());
      }
      return;
    }

    // Academic question that also carried routine signals β€” soft note, then RAG.
    if (extraction.filledSlots.length >= 2) {
      const note = silentCaptureAck(lang, extraction.filledSlots, extraction.patch);
      if (note) {
        onSendMessage({
          id: `msg-signal-${Date.now()}`,
          role: 'system',
          content: note,
          timestamp: new Date().toISOString(),
          type: 'text',
          metadata: {
            sourceGrounded: false,
            enrichmentUsed: false,
            inferenceUsed: false,
            dailyCheckIn: true,
          },
        });
      }
    }

    if (settings?.authToken?.trim() && isMultiDocSynthesizeAction(rawText, lang)) {
      const msg: AgentMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: rawText,
        timestamp: new Date().toISOString(),
        type: 'text',
      };
      onSendMessage(msg);
      setInput('');
      setShowQuickActions(false);
      setIsThinking(true);
      const courseIds = selectedSource !== 'all' ? [selectedSource] : courses.map((c) => c.id);
      try {
        const query =
          lang === 'el'
            ? 'Ξ£ΟΞ½ΞΈΞµΟƒΞµ Ο„Ξ± ΞΊΟΟΞΉΞ± ΞΈΞ­ΞΌΞ±Ο„Ξ± ΞΊΞ±ΞΉ Ο„ΞΉΟ‚ ΟƒΟ‡Ξ­ΟƒΞµΞΉΟ‚ ΞΌΞµΟ„Ξ±ΞΎΟ Ο„Ο‰Ξ½ ΞµΞ³Ξ³ΟΞ¬Ο†Ο‰Ξ½ Ο„Ξ·Ο‚ Ξ²ΞΉΞ²Ξ»ΞΉΞΏΞΈΞ®ΞΊΞ·Ο‚ ΞΌΞΏΟ….'
            : 'Synthesize the main themes and connections across my library documents.';
        const { synthesis, sourceCount, citations } = await runMultiDocSynthesize(
          settings.authToken!,
          settings,
          query,
          lang,
          courseIds.length ? courseIds : undefined,
        );
        onSendMessage({
          id: `msg-${Date.now() + 1}`,
          role: 'agent',
          content: synthesis,
          timestamp: new Date().toISOString(),
          type: 'text',
          citations,
          metadata: {
            sourceGrounded: sourceCount > 0,
            globalRag: true,
            enrichmentUsed: false,
            inferenceUsed: true,
          },
        });
      } catch (e) {
        onSendMessage({
          id: `msg-${Date.now() + 1}`,
          role: 'agent',
          content: lang === 'el'
            ? `Ξ— ΟƒΟΞ½ΞΈΞµΟƒΞ· Ξ±Ο€Ξ­Ο„Ο…Ο‡Ξµ: ${e instanceof Error ? e.message : 'ΟƒΟ†Ξ¬Ξ»ΞΌΞ±'}`
            : `Synthesis failed: ${e instanceof Error ? e.message : 'error'}`,
          timestamp: new Date().toISOString(),
          type: 'text',
        });
      } finally {
        setIsThinking(false);
      }
      return;
    }

    const parsedCommand = parseAgentCommand(rawText, lang);
    const llmInput = parsedCommand?.expandedPrompt ?? rawText;
    const chatHistory = buildAgentChatHistory(messages);

    const msg: AgentMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: rawText,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    onSendMessage(msg);
    emitAnalyticsLearningEvent('agent_message', {
      isHint: rawText.includes("Don't give me") || rawText.includes('ΞΞ· ΞΌΞΏΟ… Ξ΄ΟΟƒΞµΞΉΟ‚') || /hint|Ξ²ΞΏΞ®ΞΈ/i.test(rawText),
      command: parsedCommand?.command ?? '',
    });
    setInput('');
    setShowQuickActions(false);
    setShowAttachPicker(false);
    setShowSourceSettings(false);
    setIsThinking(true);

    const retrievalQuery = buildAgentRetrievalQuery(
      parsedCommand?.args || llmInput,
      workspaceContext ?? undefined,
    );
    const ragConcept = workspaceContext?.concept ?? activeTaskConcept;
    const ragCourseId =
      workspaceContext?.courseId ?? (selectedSource === 'all' ? undefined : selectedSource);

    const retrieval = attachSource
      ? await retrieveForQueryHybrid(uploadedFiles, retrievalQuery, settings, {
          concept: ragConcept,
          courseId: ragCourseId,
          fileIds: pinnedFileId ? [pinnedFileId] : undefined,
        })
      : { excerpt: undefined, citations: [], grounded: false };

    const queryExcerpt = retrieval.excerpt ?? sourceExcerpt;
    const contextBlock = buildAgentContextSystemBlock(workspaceContext, lang);
    const lowRetrieval = attachSource && !retrieval.grounded;
    const lowRetrievalHint = lowRetrieval ? buildLowRetrievalClarification(lang) : '';
    const composedInput = [
      contextBlock,
      lowRetrievalHint,
      llmInput,
    ].filter(Boolean).join('\n\n');

    const streamId = `msg-${Date.now() + 1}`;
    onSendMessage({
      id: streamId,
      role: 'agent',
      content: '',
      timestamp: new Date().toISOString(),
      type: 'text',
      isStreaming: true,
      metadata: {
        sourceGrounded: retrieval.grounded || (mode !== 'motivation' && !!queryExcerpt),
        enrichmentUsed: false,
        inferenceUsed: llmReady,
        globalRag: retrieval.globalRag,
        graphRag: retrieval.graphRag,
        lowRetrieval,
        agentCommand: parsedCommand?.command,
      },
    });

    setIsThinking(false);

    const recentUserTexts = messages.filter((m) => m.role === 'user').map((m) => m.content).slice(-6);
    const checkInBlock = checkInContextBlock(loadDailyCheckIn(), lang);
    const composedWithCheckIn = checkInBlock
      ? `${composedInput}\n\n${checkInBlock}`
      : composedInput;

    // Perf (product-scale): coalesce per-token stream updates into animation
    // frames. Without this, a streamed reply calls onUpdateMessage on every SSE
    // token, and because the app store is a single useState-based hook, each
    // token re-renders the entire App tree β€” including the whole Study
    // Workspace and every Studio panel β€” which freezes the UI while streaming.
    // The final content is always committed synchronously below.
    let streamPending: string | null = null;
    let streamRaf: number | null = null;
    const canRaf =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';
    const flushStream = () => {
      streamRaf = null;
      if (streamPending !== null) {
        onUpdateMessage(streamId, { content: streamPending });
        streamPending = null;
      }
    };
    const pushStreamContent = (full: string) => {
      if (!canRaf) {
        onUpdateMessage(streamId, { content: full });
        return;
      }
      streamPending = full;
      if (streamRaf === null) streamRaf = window.requestAnimationFrame(flushStream);
    };

    const { content, usedLlm, sourceGrounded } = await streamAgentReply(
      composedWithCheckIn,
      mode,
      settings,
      {
        taskTitle: workspaceContext?.stepTitle ?? activeTaskTitle,
        concept: ragConcept,
        courses: courses.map((c) => c.title),
        sourceExcerpt: queryExcerpt,
        checkIn: loadDailyCheckIn(),
        recentUserTexts,
      },
      pushStreamContent,
      chatHistory,
    );

    // Drop any queued intermediate frame β€” the gated final content wins.
    if (streamRaf !== null) {
      window.cancelAnimationFrame(streamRaf);
      streamRaf = null;
    }
    streamPending = null;

    const citationLine = retrieval.citations.length > 0
      ? retrieval.citations.slice(0, 3).map(formatCitation).join('  Β·  ')
      : undefined;

    const strictGrounding =
      settings?.sourceMode === 'strict' || settings?.sourceMode === 'notes-only';
    const gated = applyAgentGroundingGate(content, retrieval.citations, {
      strict: strictGrounding,
      lang,
    });
    const grounding = gated.report;
    if (grounding) {
      emitAnalyticsLearningEvent('grounding_checked', {
        verified: grounding.verified,
        coverage: Math.round(grounding.coverage * 100) / 100,
        faithfulness: Math.round(grounding.faithfulness * 100) / 100,
        unattributed: grounding.unattributedCount,
        ungrounded: grounding.ungroundedClaims.length,
        gatePassed: gated.gatePassed,
      });
    }

    onUpdateMessage(streamId, {
      content: gated.content,
      isStreaming: false,
      sourceReference: citationLine,
      citations: retrieval.citations,
      metadata: {
        sourceGrounded: retrieval.grounded || sourceGrounded || (mode !== 'motivation' && !!queryExcerpt),
        enrichmentUsed: settings?.sourceMode === 'enriched' && !retrieval.grounded,
        inferenceUsed: usedLlm,
        globalRag: retrieval.globalRag,
        graphRag: retrieval.graphRag,
        lowRetrieval,
        agentCommand: parsedCommand?.command,
        groundingVerified: grounding?.verified,
        groundingCoverage: grounding?.coverage,
        groundingFaithfulness: grounding?.faithfulness,
        groundingGatePassed: gated.gatePassed,
        ungroundedClaims: grounding?.ungroundedClaims,
        groundingClaims: grounding?.claimDetails,
      },
    });
    setIsThinking(false);
  };

  handleSendRef.current = handleSend;

  useEffect(() => {
    if (!draftPrompt?.trim()) return;
    const prompt = draftPrompt.trim();
    const isCheckInDraft = /check-in|checkin|ΟΞΏΟ…Ο„Ξ―Ξ½Ξ±Ο‚|ΟƒΞ·ΞΌΞµΟΞΉΞ½Ο check-in/i.test(prompt);
    if (isCheckInDraft && checkInEnabled) {
      onConsumeDraftPrompt?.();
      onConsumeAutoSend?.();
      setShowQuickActions(false);
      checkInBootstrappedRef.current = true;
      const record = loadDailyCheckIn();
      if (!isCheckInComplete(record)) {
        let next = record;
        if (!next.greetingSent) {
          onSendMessage({
            id: `checkin-greet-${Date.now()}`,
            role: 'agent',
            content: buildWarmGreeting(checkInCtx),
            timestamp: new Date().toISOString(),
            type: 'text',
            metadata: {
              sourceGrounded: false,
              enrichmentUsed: false,
              inferenceUsed: false,
              dailyCheckIn: true,
            },
          });
          next = markGreetingSent(next);
          saveDailyCheckIn(next);
        }
        const slot = nextMissingSlot(next) ?? 'openFeel';
        window.setTimeout(() => postCheckInPrompt(slot), 80);
      }
      return;
    }
    if (autoSendDraft) {
      onConsumeDraftPrompt?.();
      onConsumeAutoSend?.();
      setShowQuickActions(false);
      void handleSendRef.current(prompt);
      return;
    }
    setInput(prompt);
    setShowQuickActions(false);
    onConsumeDraftPrompt?.();
    inputRef.current?.focus();
  }, [draftPrompt, autoSendDraft, onConsumeDraftPrompt, onConsumeAutoSend, checkInEnabled, checkInCtx, onSendMessage]);

  useEffect(() => {
    const fileId = initialPinnedFileId?.trim();
    if (!fileId) return;
    const file = analyzedFiles.find((f) => f.id === fileId);
    setPinnedFileId(fileId);
    setAttachSource(true);
    if (file?.courseId) setSelectedSource(file.courseId);
    onConsumePinnedFileId?.();
  }, [initialPinnedFileId, analyzedFiles, onConsumePinnedFileId]);

  const handleQuickAction = (action: string) => {
    void handleSend(action);
  };

  const handleSuggestionChip = (chip: { id: string; label: string; value: string }) => {
    if (chip.id === 'calendar-chat-plan' || chip.value === '__calendar_chat_plan__') {
      onSendMessage({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: chip.label,
        timestamp: new Date().toISOString(),
        type: 'text',
      });
      onOpenCalendarSync?.();
      return;
    }
    if (chip.id === 'calendar-dismiss' || chip.value === '__calendar_dismiss__') {
      onSendMessage({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: chip.label,
        timestamp: new Date().toISOString(),
        type: 'text',
      });
      onSendMessage({
        id: `msg-${Date.now() + 1}`,
        role: 'agent',
        content: t('agentCalendarDismissAck'),
        timestamp: new Date().toISOString(),
        type: 'feedback',
        metadata: {
          sourceGrounded: false,
          enrichmentUsed: false,
          inferenceUsed: false,
          dailyCheckIn: true,
        },
      });
      return;
    }
    const slot =
      activeCheckInSlot
      ?? [...messages].reverse().find((m) => m.metadata?.checkInSlot)?.metadata?.checkInSlot;
    let patch: Partial<DailyCheckInAnswers> | undefined;
    if (slot) {
      const built = buildSlotPrompt(slot, checkInCtx);
      patch = built.chips.find((c) => c.id === chip.id || c.value === chip.value)?.patch;
    }
    void handleSend(chip.value, patch);
  };

  const handleToggleVoice = () => {
    if (voiceListening) {
      voiceStopRef.current?.();
      voiceStopRef.current = null;
      setVoiceListening(false);
      return;
    }
    const stop = startFeynmanVoiceInput(
      lang,
      (text) => setInput(text),
      () => {
        setVoiceListening(false);
        voiceStopRef.current = null;
      },
    );
    if (!stop) {
      onSendMessage({
        id: `voice-unsupported-${Date.now()}`,
        role: 'system',
        content: t('agentVoiceUnsupported'),
        timestamp: new Date().toISOString(),
        type: 'text',
      });
      return;
    }
    voiceStopRef.current = stop;
    setVoiceListening(true);
  };

  const handleSkipCheckInSlot = () => {
    if (!activeCheckInSlot) return;
    void handleSend(lang === 'el' ? 'Ξ Ξ±ΟΞ¬Ξ»ΞµΞΉΟΞ· Ο€ΟΞΏΟ‚ Ο„ΞΏ Ο€Ξ±ΟΟΞ½' : 'Skip for now');
  };

  const handlePathTryChip = (chip: PathTryChip) => {
    onChangeMode(chip.mode);
    void handleSend(chip.prompt);
  };

  const handleSearchSources = () => {
    setAttachSource(true);
    setShowAttachPicker(false);
    setShowSourceSettings(false);
    inputRef.current?.focus();
    sourceSelectRef.current?.focus();
  };

  const handlePinFile = (fileId: string) => {
    const file = analyzedFiles.find((f) => f.id === fileId);
    setPinnedFileId(fileId);
    setAttachSource(true);
    if (file?.courseId) setSelectedSource(file.courseId);
    setShowAttachPicker(false);
    inputRef.current?.focus();
  };

  const handleClearPinnedFile = () => {
    setPinnedFileId(null);
  };

  const handleNoAnswerHint = () => {
    void handleSend(buildNoAnswerHintPrompt(lang));
  };

  const currentMode = agentModes.find(m => m.mode === mode)!;
  const currentVisual = AGENT_MODE_VISUALS[mode];
  /** OPT-C2 β€” mute rainbow mode chrome under Minimal. */
  const quietModes = useMinimalTheme();
  /* OPT-K85 β€” non-Minimal: scrollbar-sized L/R pad; Minimal keeps prior gutters */
  const pagePadX = quietModes ? 'px-4 sm:px-6' : 'shell-edge-balance';
  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'user'),
    [messages],
  );
  const canRegenerate =
    !isThinking &&
    !!lastUserMessage?.content?.trim() &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === 'agent' &&
    !messages[messages.length - 1]?.isStreaming;
  const activeSourceMode = settings?.sourceMode ?? 'strict';
  const activeSourceLabel = useMemo(() => {
    if (pinnedFileId) {
      return analyzedFiles.find((f) => f.id === pinnedFileId)?.name ?? ui.allSources;
    }
    if (selectedSource !== 'all') {
      return courses.find((c) => c.id === selectedSource)?.title ?? ui.allSources;
    }
    return ui.allSources;
  }, [pinnedFileId, selectedSource, analyzedFiles, courses, ui.allSources]);

  return (
    <div
      className={cn(
        'agent-calm flex min-h-0',
        quietModes && 'agent-quiet-chrome',
        embedded ? 'flex-col h-full' : 'h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)]',
      )}
      data-testid={embedded ? 'agent-embedded' : 'agent-page'}
      data-quiet-modes={quietModes ? 'true' : undefined}
    >
      {!embedded && (
        <AgentModeSidebar
          className="hidden lg:flex"
          modes={agentModes}
          selectedMode={mode}
          onSelectMode={onChangeMode}
          sourceMode={activeSourceMode}
          onChangeSourceMode={onChangeSourceMode}
          sourceModeOptions={sourceModes}
          tutorModeHeading={ui.tutorModeHeading}
          sourceModeHeading={ui.sourceModeHeading}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* Agent Header */}
      {!embedded && (
      <div className={cn(pagePadX, 'py-3 border-b border-border-subtle bg-surface-secondary/30')}>
        <BlueprintSurface hint className="flex items-center justify-between max-w-none w-full min-w-0 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'agent-header-mode-icon w-9 h-9 rounded-xl flex items-center justify-center',
                quietModes && 'border border-border-subtle bg-transparent text-text-secondary',
              )}
              style={quietModes ? undefined : { backgroundColor: `${currentVisual.color}25` }}
            >
              <currentMode.icon
                className={cn('w-5 h-5', quietModes && 'text-text-secondary')}
                style={quietModes ? undefined : { color: currentVisual.color }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="ws-serif text-sm font-medium text-text-primary">{ui.title}</span>
                <button
                  onClick={() => setShowModes(!showModes)}
                  className={cn(
                    'lg:hidden flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-surface-hover border border-border-subtle transition-all',
                    quietModes ? 'hover:border-border-default' : 'hover:border-brand-500/30',
                  )}
                >
                  <currentMode.icon className={cn('w-3 h-3', quietModes ? 'text-text-secondary' : currentMode.color)} />
                  {currentMode.label}
                  <ChevronDown className={cn('w-3 h-3 transition-transform', showModes && 'rotate-180')} />
                </button>
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-surface-hover border border-border-subtle text-text-secondary">
                  <currentMode.icon className={cn('w-3 h-3', quietModes ? 'text-text-secondary' : currentMode.color)} />
                  {currentMode.label}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">
                {llmReady ? ui.llmConnected : ui.offlineMode}
                {sourceExcerpt ? ui.sourceAttached : ''}
              </p>
              <TrustBadgeRow sourceMode={activeSourceMode} lang={lang} className="mt-2" />
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <select
              ref={sourceSelectRef}
              value={selectedSource}
              onChange={e => {
                setSelectedSource(e.target.value);
                setPinnedFileId(null);
              }}
              className={cn(
                'text-xs bg-surface-input border border-border-subtle rounded-lg px-2 py-1.5 text-text-secondary focus:outline-none',
                quietModes ? 'focus:border-border-default' : 'focus:border-brand-500/50',
              )}
            >
              <option value="all">{ui.allSources}</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            {pinnedFileId && (
              <span
                className={cn(
                  'type-micro truncate max-w-[120px]',
                  quietModes ? 'text-text-secondary' : 'text-text-secondary',
                )}
              >
                {ui.pinnedFileLabel}: {analyzedFiles.find((f) => f.id === pinnedFileId)?.name ?? 'β€¦'}
              </span>
            )}
            <button
              type="button"
              aria-label={t('agentSourceSettings')}
              aria-expanded={showSourceSettings}
              onClick={() => {
                setShowSourceSettings((v) => !v);
                setShowAttachPicker(false);
              }}
              className={cn(
                'p-1.5 rounded-lg hover:bg-surface-hover text-text-tertiary',
                showSourceSettings && (quietModes ? 'bg-surface-hover text-text-primary' : 'bg-surface-hover text-text-secondary'),
              )}
            >
              <Settings2 className="w-4 h-4" aria-hidden="true" />
            </button>
            {showSourceSettings && (
              <div
                className="absolute right-0 top-full mt-1 z-20 w-64 rounded-xl border border-border-subtle bg-surface-card p-3 text-xs space-y-2"
                style={{ boxShadow: 'var(--elev-popover)' }}
              >
                <p className="font-medium text-text-secondary">{ui.sourceSettingsTitle}</p>
                <button
                  type="button"
                  onClick={() => setAttachSource((v) => !v)}
                  className="ux-focus-ring w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover text-text-secondary"
                >
                  {attachSource ? ui.sourceOn : ui.sourceOff}
                </button>
                {pinnedFileId && (
                  <button
                    type="button"
                    onClick={handleClearPinnedFile}
                    className="ux-focus-ring w-full flex items-center justify-between gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover text-text-tertiary"
                  >
                    <span className="truncate">{ui.pinnedFileLabel}</span>
                    <X className="h-3 w-3 shrink-0" aria-hidden />
                  </button>
                )}
                {onChangeSourceMode && (
                  <div className="pt-2 border-t border-border-subtle space-y-1">
                    <p className="type-micro font-medium text-text-tertiary uppercase tracking-wider px-1">
                      <AllCapsLabel>{ui.sourceModeHeading}</AllCapsLabel>
                    </p>
                    {sourceModes.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeSourceMode(opt.id)}
                        className={cn(
                          'ux-focus-ring w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover',
                          activeSourceMode === opt.id
                            ? quietModes
                              ? 'text-text-primary bg-surface-secondary'
                              : 'text-text-primary bg-surface-secondary'
                            : 'text-text-secondary',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </BlueprintSurface>
      </div>
      )}

      {embedded && (
        <div
          className="flex items-center justify-between gap-2 border-b border-border-subtle px-2.5 py-1.5 shrink-0 bg-surface-secondary/20"
          data-testid="agent-embedded-chrome"
        >
          <button
            type="button"
            onClick={() => setShowModes(!showModes)}
            className={cn(
              'flex items-center gap-1 rounded-md border border-border-subtle bg-surface-card px-1.5 py-0.5 type-caption font-medium text-text-primary transition-colors',
              quietModes ? 'hover:border-border-default' : 'hover:border-brand-200',
            )}
          >
            <currentMode.icon className={cn('h-3 w-3', quietModes ? 'text-text-secondary' : currentMode.color)} />
            {currentMode.label}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showModes && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-1 relative">
            {/* Wave M-X05 β€” compact source picker inline in embedded chrome (no full-page trip required). */}
            <button
              type="button"
              onClick={() => setShowEmbeddedSource((v) => !v)}
              aria-expanded={showEmbeddedSource}
              aria-haspopup="listbox"
              data-testid="agent-embedded-source-picker"
              className={cn(
                'flex items-center gap-1 rounded-md border border-border-subtle bg-surface-card px-1.5 py-0.5 type-caption font-medium text-text-primary transition-colors max-w-[140px]',
                quietModes ? 'hover:border-border-default' : 'hover:border-brand-200',
                showEmbeddedSource &&
                  (quietModes ? 'border-border-default text-text-primary' : 'border-border-default text-text-primary'),
              )}
              title={ui.allSources}
            >
              <Layers className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">
                {selectedSource === 'all'
                  ? ui.allSources
                  : (courses.find((c) => c.id === selectedSource)?.title ?? ui.allSources)}
              </span>
              <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', showEmbeddedSource && 'rotate-180')} aria-hidden />
            </button>
            {showEmbeddedSource && (
              <div
                role="listbox"
                data-testid="agent-embedded-source-menu"
                className="absolute right-0 top-full mt-1 z-30 w-56 max-h-64 overflow-y-auto rounded-lg border border-border-subtle bg-surface-card py-1"
                style={{ boxShadow: 'var(--elev-popover)' }}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedSource === 'all'}
                  onClick={() => {
                    setSelectedSource('all');
                    setPinnedFileId(null);
                    setShowEmbeddedSource(false);
                  }}
                  className={cn(
                    'ux-focus-ring ux-hover-strong w-full flex items-center gap-2 px-2.5 py-1.5 text-left type-caption',
                    selectedSource === 'all'
                      ? quietModes
                        ? 'text-text-primary'
                        : 'text-text-secondary0'
                      : 'text-text-secondary',
                  )}
                >
                  {selectedSource === 'all' ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : <span className="w-3 h-3 shrink-0" aria-hidden />}
                  <span className="truncate">{ui.allSources}</span>
                </button>
                {courses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={selectedSource === c.id}
                    onClick={() => {
                      setSelectedSource(c.id);
                      setPinnedFileId(null);
                      setShowEmbeddedSource(false);
                    }}
                    className={cn(
                      'ux-focus-ring ux-hover-strong w-full flex items-center gap-2 px-2.5 py-1.5 text-left type-caption',
                      selectedSource === c.id
                        ? quietModes
                          ? 'text-text-primary'
                          : 'text-text-secondary0'
                        : 'text-text-secondary',
                    )}
                  >
                    {selectedSource === c.id ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : <span className="w-3 h-3 shrink-0" aria-hidden />}
                    <span className="truncate">{c.title}</span>
                  </button>
                ))}
              </div>
            )}
            {onOpenFullPage && (
              <button
                type="button"
                onClick={onOpenFullPage}
                className={cn(
                  'type-micro font-medium text-text-muted px-1.5 py-0.5 rounded-md hover:bg-surface-hover transition-colors',
                  quietModes ? 'hover:text-text-primary' : 'hover:text-text-primary',
                )}
                data-testid="agent-open-full-page"
              >
                {lang === 'el' ? 'Ξ Ξ»Ξ®ΟΞ·Ο‚ Ο€ΟΞΏΞ²ΞΏΞ»Ξ®' : 'Full view'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Wave E13 β€” one session status strip (avoid repeating offline under every message). */}
      {embedded && !llmReady && (
        <div
          className="flex items-center gap-2 border-b border-accent-amber/30 bg-accent-amber/10 px-3 py-1.5 shrink-0"
          data-testid="agent-session-offline-strip"
          role="status"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-accent-amber" aria-hidden />
          <p className="type-caption text-text-primary min-w-0">{t('agentSessionOfflineStrip')}</p>
        </div>
      )}
      <AgentContextBanner context={workspaceContext} lang={lang} compact={embedded} />

      {!embedded && (
        <div className={cn('agent-chat-column w-full pt-3', pagePadX)}>
          {/* OPT-R14 β€” flow rail stays collapsible; Minimal defaults collapsed (M2). */}
          <CollapsibleChromeSection title={t('chromeAgentFlow')} data-testid="agent-flow-chrome" defaultOpen={false}>
            <AgentFlowRail
              activeIndex={messages.length === 0 ? 0 : messages.length < 4 ? 1 : 2}
            />
          </CollapsibleChromeSection>
        </div>
      )}

      {activeTaskTitle && !embedded && (
        <div
          className={cn(
            'agent-task-banner py-2 border-b',
            pagePadX,
            quietModes
              ? 'border-border-subtle bg-surface-secondary/40'
              : 'border-brand-500/20 bg-brand-500/5',
          )}
        >
          <div className="max-w-none w-full min-w-0 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p
                className={cn(
                  'text-xs font-semibold truncate',
                  quietModes ? 'text-text-primary' : 'text-text-secondary',
                )}
              >
                {activeTaskTitle}
              </p>
              {activeTaskConcept && (
                <p className="type-micro text-text-tertiary truncate">{ui.focus}: {activeTaskConcept}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {xpReward !== undefined && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    quietModes ? 'text-text-secondary' : 'text-accent-amber',
                  )}
                >
                  +{xpReward} XP
                </span>
              )}
              {onCompleteTask && (
                <button
                  onClick={onCompleteTask}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    quietModes
                      ? 'bg-surface-secondary border border-border-default text-text-primary hover:bg-surface-hover'
                      : 'bg-brand-600 hover:bg-brand-500 text-white',
                  )}
                >
                  {ui.completeTask}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector Dropdown β€” mobile / embedded */}
      <AnimatePresence initial={false}>
        {showModes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.36, ease: [0.2, 0, 0, 1] }}
            className={cn(
              'border-b border-border-subtle bg-surface-secondary/50 overflow-hidden',
              !embedded && 'lg:hidden',
            )}
          >
            <div className={cn('max-w-none w-full min-w-0', embedded ? 'px-3 py-2.5' : cn(pagePadX, 'py-4'))}>
              <PlatformSection title={ui.agentModeHeading} padding="none" tone="muted">
                <div className={cn(embedded ? 'pt-2' : 'pt-3')}>
                  <AgentModeCatalogGrid
                    modes={agentModes}
                    selectedMode={mode}
                    onSelectMode={onChangeMode}
                    onClose={() => setShowModes(false)}
                  />
                </div>
              </PlatformSection>
              {onChangeSourceMode && (
                <div className={cn('border-t border-border-subtle', embedded ? 'mt-2.5 pt-2.5' : 'mt-4 pt-4')}>
                  <p className="type-micro font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
                    <AllCapsLabel>{ui.sourceModeHeading}</AllCapsLabel>
                  </p>
                  <div className="space-y-1">
                    {sourceModes.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeSourceMode(opt.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-xl text-xs transition-all',
                          activeSourceMode === opt.id
                            ? quietModes
                              ? 'bg-surface-secondary text-text-primary border border-border-default'
                              : 'bg-surface-secondary text-text-primary border border-border-subtle'
                            : 'text-text-secondary hover:bg-surface-hover',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages β€” OPT-C1 centered conversation column */}
      <div
        ref={threadRef}
        className="agent-thread flex-1 overflow-y-auto"
        data-testid="agent-thread"
      >
        <div className={cn(
          'agent-chat-column w-full min-w-0 py-4 space-y-4',
          embedded ? 'px-2.5 pb-6' : pagePadX,
        )}>
          {messages.length === 0 && !isThinking && (
            embedded ? (
              <div className="py-8 text-center space-y-2" data-testid="agent-empty-invite">
                <Sparkles
                  className={cn('w-6 h-6 mx-auto', quietModes ? 'text-text-secondary' : 'text-text-secondary')}
                  aria-hidden
                />
                <p className="text-sm font-medium text-text-primary">{ui.title}</p>
                <p className="text-xs text-text-secondary px-4">
                  {llmReady ? ui.inputPlaceholder : ui.offlineMode}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2" data-testid="agent-try-chips">
                  {pathTryChips.length > 0
                    ? pathTryChips.slice(0, 3).map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        data-testid={`agent-path-try-${chip.id}`}
                        onClick={() => handlePathTryChip(chip)}
                        className="ux-agent-chip"
                      >
                        {chip.label}
                      </button>
                    ))
                    : contextualSuggestions.slice(0, 2).map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleQuickAction(action)}
                        className="ux-agent-chip"
                      >
                        {action}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
            <div className="py-8 space-y-4" data-testid="agent-empty-invite">
              <PlatformEmptyState
                title={ui.title}
                description={llmReady ? ui.inputPlaceholder : ui.offlineMode}
                icon={Sparkles}
                actionLabel={pathTryChips[0]?.label ?? contextualSuggestions[0]}
                onAction={() => {
                  if (pathTryChips[0]) handlePathTryChip(pathTryChips[0]);
                  else if (contextualSuggestions[0]) handleQuickAction(contextualSuggestions[0]);
                }}
                secondaryActionLabel={pathTryChips[1]?.label ?? contextualSuggestions[1]}
                onSecondaryAction={() => {
                  if (pathTryChips[1]) handlePathTryChip(pathTryChips[1]);
                  else if (contextualSuggestions[1]) handleQuickAction(contextualSuggestions[1]);
                }}
              />
              {(pathTryChips.length > 0 || contextualSuggestions.length > 0) && (
                <div className="max-w-xl mx-auto" data-testid="agent-try-chips">
                  <p className="text-xs text-text-tertiary mb-3 text-center">{contextualPrompts.emptySuggestionsHeading}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {pathTryChips.length > 0
                      ? pathTryChips.map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          data-testid={`agent-path-try-${chip.id}`}
                          onClick={() => handlePathTryChip(chip)}
                          className="ux-agent-chip text-left"
                        >
                          {chip.label}
                        </button>
                      ))
                      : contextualSuggestions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => handleQuickAction(action)}
                          className="ux-agent-chip text-left"
                        >
                          {action}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
            )
          )}
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onGoToSource={onGoToSource}
              lang={lang}
              ui={ui}
              suppressOfflineBadge={embedded && !llmReady}
              onSuggestionChip={handleSuggestionChip}
              chipHint={t('agentCheckInChipHint')}
              skipLabel={t('agentCheckInSkip')}
              onSkipCheckIn={
                msg.metadata?.checkInSlot && msg.metadata.checkInSlot === activeCheckInSlot
                  ? handleSkipCheckInSlot
                  : undefined
              }
              ttsSupported={isAgentTtsSupported()}
              isSpeaking={speakingMessageId === msg.id}
              onToggleSpeak={() => handleToggleSpeakMessage(msg)}
              speakLabel={t('agentSpeakReply')}
              stopSpeakLabel={t('agentStopSpeak')}
            />
          ))}
          {isThinking && (
            <div className="agent-thinking flex gap-3 px-1 py-2 text-sm text-text-muted">
              <Sparkles
                className={cn(
                  'w-4 h-4 animate-pulse shrink-0 mt-0.5',
                  quietModes ? 'text-text-tertiary' : 'text-text-secondary',
                )}
              />
              <span>{ui.thinking}</span>
            </div>
          )}
          <div ref={messagesEndRef} />

          {/* Quick Actions β€” collapsed in embedded chat to save vertical space */}
          {showQuickActions && messages.length <= 4 && !embedded && (
            <motion.div
              {...entranceMotion(quietModes)}
              className="pt-4"
            >
              <CollapsibleChromeSection title={t('chromeQuickActions')} data-testid="agent-quick-actions-chrome">
                <p className="text-xs text-text-tertiary mb-3 px-1">{ui.quickActionsHeading}</p>
                <div className="flex flex-wrap gap-2 px-1 pb-2">
                  {contextualSuggestions.map(action => (
                    <button
                      key={action}
                      onClick={() => handleQuickAction(action)}
                      className="ux-agent-chip font-medium"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </CollapsibleChromeSection>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input β€” OPT-C1 sticky soft composer (still holds source/attach/send) */}
      <div
        className={cn(
          'agent-composer border-t border-border-subtle bg-surface-secondary/30 shrink-0',
          embedded ? 'pb-1.5' : 'pb-20 lg:pb-0',
        )}
        data-testid="agent-composer"
      >
        <div className={cn('agent-chat-column w-full min-w-0', embedded ? 'px-2.5 py-2' : cn(pagePadX, 'py-3'))}>
          <div className="agent-composer-shell">
            <div className="flex-1 relative min-w-0">
              <textarea
                ref={inputRef}
                value={input}
                data-testid="agent-chat-input"
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={ui.inputPlaceholder}
                rows={1}
                disabled={isThinking}
                className={cn(
                  'w-full rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none',
                  embedded ? 'px-3 py-2' : 'px-4 py-3',
                  quietModes ? 'focus:border-border-default' : 'focus:border-brand-500/50',
                )}
                style={{ minHeight: embedded ? '38px' : '46px', maxHeight: '120px' }}
              />
            </div>
            {/* OPT-K75 β€” tools beside field (never absolute-over placeholder on phone) */}
            <div className="agent-composer-tools flex items-end gap-0.5 shrink-0 self-end pb-0.5" data-testid="agent-composer-tools">
              <button
                type="button"
                aria-label={voiceListening ? t('agentVoiceListening') : t('agentVoiceInput')}
                data-testid="agent-voice-input"
                aria-pressed={voiceListening}
                onClick={handleToggleVoice}
                disabled={isThinking}
                title={voiceListening ? t('agentVoiceListening') : t('agentVoiceInput')}
                className={cn(
                  'inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1 hover:bg-surface-hover text-text-secondary',
                  voiceListening && 'text-accent-rose bg-accent-rose/10',
                )}
              >
                <Mic className={cn('w-4 h-4', voiceListening && 'animate-pulse')} aria-hidden="true" />
                {/* Wave E13 β€” always show captions: notebook AI column is often <sm */}
                <span className="type-caption leading-none text-text-muted">
                  {t('agentComposerVoice')}
                </span>
              </button>
              <button
                type="button"
                aria-label={t('agentSearchSources')}
                onClick={handleSearchSources}
                title={t('agentSearchSources')}
                className={cn(
                  'inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1 hover:bg-surface-hover text-text-secondary',
                  attachSource && 'text-text-primary',
                )}
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span className="type-caption leading-none text-text-muted">
                  {t('agentComposerSources')}
                </span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  aria-label={t('agentAttachFile')}
                  aria-expanded={showAttachPicker}
                  title={t('agentAttachFile')}
                  onClick={() => {
                    setShowAttachPicker((v) => !v);
                    setShowSourceSettings(false);
                  }}
                  className={cn(
                    'inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1 hover:bg-surface-hover text-text-secondary',
                    pinnedFileId && 'text-text-primary',
                  )}
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span className="type-caption leading-none text-text-muted">
                    {t('agentComposerFile')}
                  </span>
                </button>
                {showAttachPicker && (
                  <div className="absolute right-0 bottom-full mb-1 z-20 w-64 max-h-48 overflow-y-auto rounded-xl border border-border-subtle bg-surface-card shadow-lg p-2 text-xs">
                    <p className="px-2 py-1 font-medium text-text-secondary">{ui.attachFileTitle}</p>
                    {analyzedFiles.length === 0 ? (
                      <p className="px-2 py-2 text-text-muted">{ui.noAnalyzedFiles}</p>
                    ) : (
                      analyzedFiles.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => handlePinFile(file.id)}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover truncate',
                            pinnedFileId === file.id
                              ? quietModes
                                ? 'text-text-primary bg-surface-secondary'
                                : 'text-text-primary bg-surface-secondary'
                              : 'text-text-secondary',
                          )}
                        >
                          {file.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isThinking}
              aria-label={t('agentSendMessage')}
              data-testid="agent-send"
              className={cn(
                'agent-composer-send rounded-xl transition-all shrink-0 self-end',
                embedded ? 'p-2' : 'p-3',
                input.trim() && !isThinking
                  ? quietModes
                    ? 'bg-text-primary text-surface-primary hover:opacity-90'
                    : 'bg-brand-600 hover:bg-brand-500 text-white'
                  : 'bg-surface-hover text-text-muted cursor-not-allowed'
              )}
            >
              <Send className={cn(embedded ? 'w-4 h-4' : 'w-5 h-5')} aria-hidden="true" />
            </button>
          </div>

          {!embedded && (
          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <p className="type-micro text-text-muted text-center w-full sm:text-left sm:w-auto">
              {lang === 'el' ? 'Ξ Ξ·Ξ³Ξ®' : 'Source'}: {activeSourceLabel}
              {' Β· '}
              {ui.sourceModeFooter(activeSourceMode)}
              {' Β· '}
              <button
                type="button"
                onClick={handleNoAnswerHint}
                disabled={isThinking}
                className={cn(
                  'transition-colors disabled:opacity-50',
                  quietModes
                    ? 'text-text-secondary hover:text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {ui.noAnswerHint}
              </button>
              {' Β· '}
              {ui.shiftEnter}
            </p>
            {canRegenerate && lastUserMessage && (
              <button
                type="button"
                data-testid="agent-regenerate"
                onClick={() => void handleSend(lastUserMessage.content)}
                className="inline-flex items-center gap-1 type-micro text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                {lang === 'el' ? 'Ξ•Ο€Ξ±Ξ½Ξ¬Ξ»Ξ·ΟΞ·' : 'Regenerate'}
              </button>
            )}
          </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function CitationList({
  citations,
  onGoToSource,
  lang = 'en',
  ui,
}: {
  citations: MessageCitation[];
  onGoToSource?: (highlight: { fileId: string; charStart: number; charEnd: number }) => void;
  lang?: 'en' | 'el';
  ui: AgentUiCopy;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 pt-2 border-t border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
      >
        <FileText className="w-3 h-3" />
        {citations.length} {citations.length === 1 ? ui.citationSingular : ui.citationPlural} Β· {ui.citationToggle}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {citations.map((c) => (
            <div key={c.chunkId} className="rounded-lg border border-border-subtle bg-surface-primary/40 px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 type-micro text-text-secondary font-medium min-w-0">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{c.fileName}</span>
                  <span className="text-text-muted">Β· {c.locator}</span>
                  {c.heading && <span className="text-text-muted truncate">Β· {c.heading}</span>}
                </div>
                {onGoToSource && (
                  <GoToSourceButton lang={lang} onClick={() => onGoToSource(spanFromCitation(c))} />
                )}
              </div>
              <p className="type-caption text-text-tertiary mt-0.5 leading-snug">{c.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onGoToSource,
  lang = 'en',
  ui,
  suppressOfflineBadge = false,
  onSuggestionChip,
  chipHint,
  skipLabel,
  onSkipCheckIn,
  ttsSupported,
  isSpeaking,
  onToggleSpeak,
  speakLabel,
  stopSpeakLabel,
}: {
  message: AgentMessage;
  onGoToSource?: (highlight: { fileId: string; charStart: number; charEnd: number }) => void;
  lang?: 'en' | 'el';
  ui: AgentUiCopy;
  /** Session already shows offline strip β€” hide per-message offline chip. */
  suppressOfflineBadge?: boolean;
  onSuggestionChip?: (chip: { id: string; label: string; value: string }) => void;
  chipHint?: string;
  skipLabel?: string;
  onSkipCheckIn?: () => void;
  ttsSupported?: boolean;
  isSpeaking?: boolean;
  onToggleSpeak?: () => void;
  speakLabel?: string;
  stopSpeakLabel?: string;
}) {
  const { t } = useI18n();
  const isMinimal = useMinimalTheme();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const chips = message.metadata?.suggestionChips ?? [];
  const showOfflineMeta = message.metadata?.inferenceUsed === false && !suppressOfflineBadge;
  const showGroundingMeta =
    message.metadata?.groundingFaithfulness !== undefined
    || message.metadata?.groundingVerified != null;
  const showStatusStrip = !isUser && !message.isStreaming && (showOfflineMeta || showGroundingMeta);

  if (isSystem) {
    return (
      <div className="text-center">
        <span
          className="agent-system-status text-xs px-3 py-1.5 rounded-full inline-block max-w-full border border-border-default bg-surface-tertiary text-text-primary font-medium"
          data-testid="agent-system-status"
        >
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      {...entranceMotion(isMinimal, { y: 5 })}
      className={cn('agent-message-row flex gap-3', isUser && 'flex-row-reverse')}
      data-testid={isUser ? 'agent-message-user' : 'agent-message-assistant'}
    >
      {!isUser && (
        <div className="agent-message-avatar w-8 h-8 rounded-lg bg-surface-tertiary border border-border-subtle flex items-center justify-center shrink-0 mt-1" aria-hidden>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={cn(
        'agent-message-bubble max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'agent-message-bubble-user agent-user-bubble text-white rounded-tr-md'
          : 'agent-message-bubble-assistant bg-surface-card border border-border-subtle text-text-primary rounded-tl-md',
        isUser ? 'ml-auto' : 'mr-auto',
      )}>
        <div>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <RichText text={message.content || (message.isStreaming ? 'β€¦' : '')} />
          )}
          {message.isStreaming && message.content && (
            <span className="inline-block w-0.5 h-4 bg-brand-400 animate-pulse ml-0.5 align-middle" />
          )}
        </div>

        {/* Wave E13 β€” one meta strip: offline (unless session strip) + faithfulness + verified */}
        {showStatusStrip && (
          <div
            className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border-subtle bg-surface-secondary/50 px-2.5 py-1.5"
            data-testid="agent-message-status-strip"
          >
            {showOfflineMeta && (
              <span
                className="inline-flex items-center gap-1 type-caption text-accent-amber"
                data-testid="agent-offline-fallback-badge"
                title={ui.offlineMode}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                {ui.offlineMode}
              </span>
            )}
            {message.metadata?.groundingFaithfulness !== undefined && (
              <span
                className={cn(
                  'type-caption font-medium',
                  message.metadata.groundingVerified ? 'text-accent-emerald' : 'text-text-secondary',
                )}
                data-testid="agent-faithfulness-score"
              >
                {t('agentGroundingMetaCollapsed').replace(
                  '{pct}',
                  String(Math.round(message.metadata.groundingFaithfulness * 100)),
                )}
              </span>
            )}
            {message.metadata?.groundingVerified === true && (
              <span className="type-caption text-accent-emerald">{t('agentGroundingMetaVerified')}</span>
            )}
            {message.metadata?.groundingVerified === false && (
              <span className="inline-flex items-center gap-1 type-caption text-accent-amber">
                <AlertTriangle className="w-3 h-3" aria-hidden />
                {ui.groundingWarning}
              </span>
            )}
          </div>
        )}

        {message.citations && message.citations.length > 0 ? (
          <CitationList citations={message.citations} onGoToSource={onGoToSource} lang={lang} ui={ui} />
        ) : message.sourceReference ? (
          <div className={cn(
            'agent-message-meta mt-2 pt-2 border-t flex items-center gap-1.5 text-xs',
            isUser ? 'border-white/20 text-white/70' : 'border-border-subtle text-text-tertiary',
          )}>
            <FileText className="w-3 h-3" />
            {message.sourceReference}
          </div>
        ) : null}

        {(message.metadata?.groundingClaims?.length ?? 0) > 0 && (
          <details
            className="mt-2 rounded-lg border border-border-subtle bg-surface-primary/40 px-2.5 py-2"
            data-testid="agent-grounding-claims"
          >
            <summary className="cursor-pointer type-caption font-medium text-text-secondary hover:text-text-primary">
              {ui.citationToggle}
            </summary>
            <div className="mt-2 space-y-2">
            {message.metadata!.groundingClaims!.map((detail) => (
              <div
                key={detail.claim.slice(0, 64)}
                className={cn(
                  'rounded-md border px-2 py-1.5 type-caption',
                  detail.grounded
                    ? 'border-accent-emerald/25 bg-accent-emerald/5 text-text-secondary'
                    : 'border-accent-amber/30 bg-accent-amber/5 text-text-secondary',
                )}
              >
                <p className="leading-snug">{detail.claim}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className={cn('font-mono', detail.grounded ? 'text-accent-emerald' : 'text-accent-amber')}>
                    {Math.round(detail.score * 100)}%
                  </span>
                  {detail.source && onGoToSource && (
                    <button
                      type="button"
                      className="text-text-secondary hover:text-text-primary font-medium shrink-0"
                      onClick={() => onGoToSource(detail.source!)}
                    >
                      {ui.viewSourceForClaim}
                    </button>
                  )}
                </div>
              </div>
            ))}
            </div>
          </details>
        )}

        {message.metadata?.ungroundedClaims && message.metadata.ungroundedClaims.length > 0
          && !(message.metadata.groundingClaims?.length) && (
          <div
            className="mt-2 rounded-lg border border-accent-amber/25 bg-accent-amber/5 px-2.5 py-2"
            data-testid="agent-ungrounded-claims"
          >
            <p className="type-micro font-medium text-accent-amber mb-1">{ui.ungroundedClaimsHeading}</p>
            <ul className="space-y-1 type-micro text-text-secondary list-disc pl-4">
              {message.metadata.ungroundedClaims.slice(0, 3).map((claim) => (
                <li key={claim.slice(0, 48)}>{claim}</li>
              ))}
            </ul>
            {onGoToSource && message.citations?.[0] && (
              <button
                type="button"
                className="mt-2 type-micro text-text-secondary hover:text-text-primary font-medium"
                onClick={() => onGoToSource(spanFromCitation(message.citations![0]!))}
              >
                {ui.citationToggle}
              </button>
            )}
          </div>
        )}

        {message.confidence !== undefined && message.confidence < 0.8 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-accent-amber">
            <AlertTriangle className="w-3 h-3" />
            <span>{ui.lowConfidence}</span>
          </div>
        )}

        {!isUser && !message.isStreaming && chips.length > 0 && onSuggestionChip && (
          <div className="mt-3 space-y-2" data-testid="agent-suggestion-chips">
            {chipHint && (
              <p className="type-micro text-text-muted">{chipHint}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  data-testid={`agent-chip-${chip.id}`}
                  onClick={() => onSuggestionChip(chip)}
                  className="ux-agent-chip text-left font-medium"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {onSkipCheckIn && skipLabel && (
              <button
                type="button"
                data-testid="agent-checkin-skip"
                onClick={onSkipCheckIn}
                className="type-micro text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {skipLabel}
              </button>
            )}
          </div>
        )}

        {!isUser && !message.isStreaming && ttsSupported && onToggleSpeak && message.content.trim() && (
          <button
            type="button"
            data-testid="agent-tts-toggle"
            aria-label={isSpeaking ? stopSpeakLabel : speakLabel}
            aria-pressed={Boolean(isSpeaking)}
            onClick={onToggleSpeak}
            className={cn(
              'mt-2 inline-flex items-center gap-1 type-micro transition-colors',
              isSpeaking ? 'text-accent-rose' : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {isSpeaking ? <VolumeX className="w-3 h-3" aria-hidden /> : <Volume2 className="w-3 h-3" aria-hidden />}
            {isSpeaking ? stopSpeakLabel : speakLabel}
          </button>
        )}

        {/* Source attribution labels β€” OPT-K16 quiet under Minimal; OPT-K74 phone wrap clear of composer */}
        {!isUser && message.metadata && (
          <div className="agent-meta-badge-row mt-2 pt-2 border-t border-border-subtle flex items-center gap-1.5 flex-wrap pb-0.5">
            {message.metadata.sourceGrounded && (
              <span className="agent-meta-badge type-caption px-1.5 py-0.5 rounded border border-accent-emerald/45 bg-surface-secondary text-text-primary font-medium">{ui.badgeSourceGrounded}</span>
            )}
            {message.metadata.inferenceUsed && (
              <span className="agent-meta-badge type-caption px-1.5 py-0.5 rounded bg-surface-secondary text-text-primary border border-border-subtle font-medium">{ui.badgeAiInference}</span>
            )}
            {message.metadata.enrichmentUsed && (
              <span className="agent-meta-badge type-caption px-1.5 py-0.5 rounded border border-accent-amber/45 bg-surface-secondary text-text-primary font-medium">{ui.badgeEnrichment}</span>
            )}
            {message.metadata.globalRag && (
              <span className="agent-meta-badge type-caption px-1.5 py-0.5 rounded border border-accent-cyan/45 bg-surface-secondary text-text-primary font-medium">{ui.badgeGlobalRag}</span>
            )}
            {message.metadata.graphRag && (
              <span className="agent-meta-badge type-caption px-1.5 py-0.5 rounded bg-surface-secondary text-text-primary border border-border-subtle font-medium">{ui.badgeGraphRag}</span>
            )}
            {message.metadata.globalRag === false && message.metadata.sourceGrounded && (
              <span className="agent-meta-badge type-caption px-1.5 py-0.5 rounded bg-surface-secondary text-text-primary border border-border-subtle font-medium">{ui.badgeLocalRag}</span>
            )}
            {message.metadata.lowRetrieval && (
              <span className="agent-meta-badge agent-meta-badge--warn type-caption px-1.5 py-0.5 rounded border border-accent-rose/45 bg-surface-secondary text-text-primary font-medium">{ui.badgeLowRetrieval}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

