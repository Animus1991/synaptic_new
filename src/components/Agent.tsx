import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, BookOpen, Brain, GraduationCap, MessageSquare,
  Code, Lightbulb, AlertTriangle, Mic, ChevronDown,
  RotateCcw, Target, PenTool, Smile, Search, FileText,
  HelpCircle, Zap, Settings2
} from '@/lib/lucide-shim';
import type { AgentMessage, AgentMode, Course, UserSettings, UploadedFile, MessageCitation, SkillNode } from '../types';
import type { DashboardNextAction } from '../lib/dashboardNextAction';
import { cn } from '../utils/cn';
import { streamAgentReply, isLlmAvailable } from '../lib/llmClient';
import { buildSourceExcerpt, retrieveForQueryHybrid } from '../lib/sourceContext';
import { buildAgentChatHistory } from '../lib/agentConversation';
import {
  parseAgentCommand,
  buildNoAnswerHintPrompt,
  buildLowRetrievalClarification,
} from '../lib/agentCommands';
import { buildAgentRetrievalQuery, buildAgentContextSystemBlock, type AgentWorkspaceContext } from '../lib/agentWorkspaceContext';
import { isMultiDocSynthesizeAction, runMultiDocSynthesize } from '../lib/agentMultiDocSynthesize';
import { spanFromCitation } from '../lib/conceptProvenance';
import { applyAgentGroundingGate } from '../lib/grounding';
import { emitAnalyticsLearningEvent } from '../lib/emitLearningEvent';
import { formatCitation } from '../lib/rag';
import { GoToSourceButton } from './GoToSourceButton';
import { AgentContextBanner } from './AgentContextBanner';
import { RichText } from './RichText';
import { getAgentContent, type AgentUiCopy } from '../lib/agentContent';
import { AGENT_MODE_VISUALS } from '../lib/agentCatalog';
import { AgentModeCatalogGrid, AgentModeSidebar } from './agent/AgentModeSidebar';
import { useI18n } from '../lib/i18n';
import { PlatformSection } from './ui/primitives';
import { PlatformEmptyState } from './ui/PlatformEmptyState';

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
}

const AGENT_MODE_META: { mode: AgentMode; icon: typeof Brain; color: string }[] = [
  { mode: 'socratic', icon: HelpCircle, color: 'text-brand-400' },
  { mode: 'direct', icon: Lightbulb, color: 'text-accent-cyan' },
  { mode: 'beginner', icon: Smile, color: 'text-accent-emerald' },
  { mode: 'exam-coach', icon: GraduationCap, color: 'text-accent-amber' },
  { mode: 'deep-theory', icon: BookOpen, color: 'text-brand-300' },
  { mode: 'practical', icon: Code, color: 'text-accent-teal' },
  { mode: 'error-diagnosis', icon: AlertTriangle, color: 'text-accent-rose' },
  { mode: 'feynman', icon: MessageSquare, color: 'text-accent-orange' },
  { mode: 'debate', icon: Target, color: 'text-brand-200' },
  { mode: 'oral-exam', icon: Mic, color: 'text-accent-rose' },
  { mode: 'math-tutor', icon: Zap, color: 'text-accent-amber' },
  { mode: 'coding-tutor', icon: Code, color: 'text-accent-teal' },
  { mode: 'writing-coach', icon: PenTool, color: 'text-brand-300' },
  { mode: 'memory-coach', icon: RotateCcw, color: 'text-accent-emerald' },
  { mode: 'motivation', icon: Sparkles, color: 'text-accent-amber' },
];

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
  workspaceContext,
  embedded = false,
  autoFocusInput = false,
  onOpenFullPage,
  onChangeSourceMode,
  dashboardNextAction = null,
  weakAreas = [],
}: AgentProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [showModes, setShowModes] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [attachSource, setAttachSource] = useState(true);
  const [pinnedFileId, setPinnedFileId] = useState<string | null>(null);
  const [showSourceSettings, setShowSourceSettings] = useState(false);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const sourceSelectRef = useRef<HTMLSelectElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const llmReady = isLlmAvailable(settings);
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
  const contextualSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    if (dashboardNextAction) {
      suggestions.push(contextualPrompts.fromNextAction(dashboardNextAction.label, dashboardNextAction.reason));
    }
    if (activeTaskTitle) {
      suggestions.push(contextualPrompts.fromTask(activeTaskTitle));
    }
    const weakConcept = weakAreas[0]?.concept ?? dashboardNextAction?.concept;
    if (weakConcept) {
      suggestions.push(contextualPrompts.fromWeakArea(weakConcept));
    }
    for (const action of quickActions) {
      if (suggestions.length >= 5) break;
      if (!suggestions.includes(action)) suggestions.push(action);
    }
    return suggestions.slice(0, 5);
  }, [dashboardNextAction, activeTaskTitle, weakAreas, quickActions, contextualPrompts]);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!embedded || !autoFocusInput) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [embedded, autoFocusInput]);

  const handleSendRef = useRef<(overrideText?: string) => Promise<void>>(async () => {});

  const handleSend = async (overrideText?: string) => {
    const rawText = (overrideText ?? input).trim();
    if (!rawText || isThinking) return;

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
            ? 'Σύνθεσε τα κύρια θέματα και τις σχέσεις μεταξύ των εγγράφων της βιβλιοθήκης μου.'
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
            ? `Η σύνθεση απέτυχε: ${e instanceof Error ? e.message : 'σφάλμα'}`
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
      isHint: rawText.includes("Don't give me") || rawText.includes('Μη μου δώσεις') || /hint|βοήθ/i.test(rawText),
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

    const { content, usedLlm, sourceGrounded } = await streamAgentReply(
      composedInput,
      mode,
      settings,
      {
        taskTitle: workspaceContext?.stepTitle ?? activeTaskTitle,
        concept: ragConcept,
        courses: courses.map((c) => c.title),
        sourceExcerpt: queryExcerpt,
      },
      (full) => onUpdateMessage(streamId, { content: full }),
      chatHistory,
    );

    const citationLine = retrieval.citations.length > 0
      ? retrieval.citations.slice(0, 3).map(formatCitation).join('  ·  ')
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
    if (autoSendDraft) {
      const prompt = draftPrompt.trim();
      onConsumeDraftPrompt?.();
      onConsumeAutoSend?.();
      setShowQuickActions(false);
      void handleSendRef.current(prompt);
      return;
    }
    setInput(draftPrompt);
    setShowQuickActions(false);
    onConsumeDraftPrompt?.();
    inputRef.current?.focus();
  }, [draftPrompt, autoSendDraft, onConsumeDraftPrompt, onConsumeAutoSend]);

  const handleQuickAction = (action: string) => {
    void handleSend(action);
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
        'flex min-h-0',
        embedded ? 'flex-col h-full' : 'h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)]',
      )}
      data-testid={embedded ? 'agent-embedded' : 'agent-page'}
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
      <div className="px-4 sm:px-6 py-3 border-b border-border-subtle bg-surface-secondary/30">
        <div className="flex items-center justify-between max-w-none w-full min-w-0 ws-bento-soft px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${currentVisual.color}25` }}
            >
              <currentMode.icon className="w-5 h-5" style={{ color: currentVisual.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="ws-serif text-sm font-medium text-text-primary">{ui.title}</span>
                <button
                  onClick={() => setShowModes(!showModes)}
                  className="lg:hidden flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-surface-hover border border-border-subtle hover:border-brand-500/30 transition-all"
                >
                  <currentMode.icon className={cn('w-3 h-3', currentMode.color)} />
                  {currentMode.label}
                  <ChevronDown className={cn('w-3 h-3 transition-transform', showModes && 'rotate-180')} />
                </button>
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-surface-hover border border-border-subtle text-text-secondary">
                  <currentMode.icon className={cn('w-3 h-3', currentMode.color)} />
                  {currentMode.label}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">
                {llmReady ? ui.llmConnected : ui.offlineMode}
                {sourceExcerpt ? ui.sourceAttached : ''}
              </p>
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
              className="text-xs bg-surface-input border border-border-subtle rounded-lg px-2 py-1.5 text-text-secondary focus:outline-none focus:border-brand-500/50"
            >
              <option value="all">{ui.allSources}</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            {pinnedFileId && (
              <span className="text-[10px] text-brand-300 truncate max-w-[120px]">
                {ui.pinnedFileLabel}: {analyzedFiles.find((f) => f.id === pinnedFileId)?.name ?? '…'}
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
                showSourceSettings && 'bg-surface-hover text-brand-300',
              )}
            >
              <Settings2 className="w-4 h-4" aria-hidden="true" />
            </button>
            {showSourceSettings && (
              <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-xl border border-border-subtle bg-surface-card shadow-lg p-3 text-xs space-y-2">
                <p className="font-medium text-text-secondary">{ui.sourceSettingsTitle}</p>
                <button
                  type="button"
                  onClick={() => setAttachSource((v) => !v)}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover text-text-secondary"
                >
                  {attachSource ? ui.sourceOn : ui.sourceOff}
                </button>
                {pinnedFileId && (
                  <button
                    type="button"
                    onClick={handleClearPinnedFile}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover text-text-tertiary"
                  >
                    {ui.pinnedFileLabel}: ✕
                  </button>
                )}
                {onChangeSourceMode && (
                  <div className="pt-2 border-t border-border-subtle space-y-1">
                    <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider px-1">
                      {ui.sourceModeHeading}
                    </p>
                    {sourceModes.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeSourceMode(opt.id)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover',
                          activeSourceMode === opt.id ? 'text-brand-300 bg-brand-500/10' : 'text-text-secondary',
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
        </div>
      </div>
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2 shrink-0 bg-surface-secondary/20">
          <button
            type="button"
            onClick={() => setShowModes(!showModes)}
            className="flex items-center gap-1 rounded-md border border-border-subtle bg-surface-card px-2 py-1 text-xs font-medium text-text-secondary hover:border-brand-200 transition-colors"
          >
            <currentMode.icon className={cn('h-3 w-3', currentMode.color)} />
            {currentMode.label}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showModes && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-1">
            {onOpenFullPage && (
              <button
                type="button"
                onClick={onOpenFullPage}
                className="type-micro font-medium text-text-muted hover:text-brand-700 px-2 py-1 rounded-md hover:bg-surface-hover transition-colors"
                data-testid="agent-open-full-page"
              >
                {lang === 'el' ? 'Πλήρης προβολή' : 'Full view'}
              </button>
            )}
          </div>
        </div>
      )}

      <AgentContextBanner context={workspaceContext} lang={lang} compact={embedded} />

      {activeTaskTitle && !embedded && (
        <div className="px-4 sm:px-6 py-2 border-b border-brand-500/20 bg-brand-500/5">
          <div className="max-w-none w-full min-w-0 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-300 truncate">{activeTaskTitle}</p>
              {activeTaskConcept && (
                <p className="text-[10px] text-text-tertiary truncate">{ui.focus}: {activeTaskConcept}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {xpReward !== undefined && (
                <span className="text-xs text-accent-amber font-medium">+{xpReward} XP</span>
              )}
              {onCompleteTask && (
                <button
                  onClick={onCompleteTask}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all"
                >
                  {ui.completeTask}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector Dropdown — mobile / embedded */}
      <AnimatePresence>
        {showModes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'border-b border-border-subtle bg-surface-secondary/50 overflow-hidden',
              !embedded && 'lg:hidden',
            )}
          >
            <div className="max-w-none w-full min-w-0 px-4 sm:px-6 py-4">
              <PlatformSection title={ui.agentModeHeading} padding="none" tone="muted">
                <div className="pt-3">
                  <AgentModeCatalogGrid
                    modes={agentModes}
                    selectedMode={mode}
                    onSelectMode={onChangeMode}
                    onClose={() => setShowModes(false)}
                  />
                </div>
              </PlatformSection>
              {onChangeSourceMode && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    {ui.sourceModeHeading}
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
                            ? 'bg-brand-500/10 text-brand-300 border border-brand-500/25'
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-none w-full min-w-0 px-4 sm:px-6 py-4 space-y-4">
          {messages.length === 0 && !isThinking && (
            embedded ? (
              <div className="py-8 text-center space-y-2">
                <Sparkles className="w-6 h-6 mx-auto text-brand-600" aria-hidden />
                <p className="text-sm font-medium text-text-primary">{ui.title}</p>
                <p className="text-xs text-text-secondary px-4">
                  {llmReady ? ui.inputPlaceholder : ui.offlineMode}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {contextualSuggestions.slice(0, 2).map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleQuickAction(action)}
                      className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary hover:bg-surface-hover transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
            <div className="py-8 space-y-4">
              <PlatformEmptyState
                title={ui.title}
                description={llmReady ? ui.inputPlaceholder : ui.offlineMode}
                icon={Sparkles}
                actionLabel={contextualSuggestions[0]}
                onAction={() => contextualSuggestions[0] && handleQuickAction(contextualSuggestions[0])}
                secondaryActionLabel={contextualSuggestions[1]}
                onSecondaryAction={() => contextualSuggestions[1] && handleQuickAction(contextualSuggestions[1])}
              />
              {contextualSuggestions.length > 0 && (
                <div className="max-w-xl mx-auto">
                  <p className="text-xs text-text-tertiary mb-3 text-center">{contextualPrompts.emptySuggestionsHeading}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {contextualSuggestions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleQuickAction(action)}
                        className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:border-brand-500/30 hover:bg-surface-hover transition-colors text-left"
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
            <MessageBubble key={msg.id} message={msg} onGoToSource={onGoToSource} lang={lang} ui={ui} />
          ))}
          {isThinking && (
            <div className="flex gap-3 px-1 py-2 text-sm text-text-muted">
              <Sparkles className="w-4 h-4 text-brand-400 animate-pulse shrink-0 mt-0.5" />
              <span>{ui.thinking}</span>
            </div>
          )}
          <div ref={messagesEndRef} />

          {/* Quick Actions — collapsed in embedded chat to save vertical space */}
          {showQuickActions && messages.length <= 4 && !embedded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4"
            >
              <p className="text-xs text-text-tertiary mb-3">{ui.quickActionsHeading}</p>
              <div className="flex flex-wrap gap-2">
                {contextualSuggestions.map(action => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle hover:border-brand-500/30 hover:bg-surface-hover text-text-secondary transition-all"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className={cn('border-t border-border-subtle bg-surface-secondary/30', embedded ? 'pb-2' : 'pb-20 lg:pb-0')}>
        <div className="max-w-none w-full min-w-0 px-4 sm:px-6 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
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
                className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50 resize-none"
                style={{ minHeight: '46px', maxHeight: '120px' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t('agentSearchSources')}
                  onClick={handleSearchSources}
                  className={cn(
                    'p-1.5 rounded-lg hover:bg-surface-hover text-text-muted',
                    attachSource && 'text-brand-400',
                  )}
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label={t('agentAttachFile')}
                    aria-expanded={showAttachPicker}
                    onClick={() => {
                      setShowAttachPicker((v) => !v);
                      setShowSourceSettings(false);
                    }}
                    className={cn(
                      'p-1.5 rounded-lg hover:bg-surface-hover text-text-muted',
                      pinnedFileId && 'text-brand-400',
                    )}
                  >
                    <FileText className="w-4 h-4" aria-hidden="true" />
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
                              pinnedFileId === file.id ? 'text-brand-300 bg-brand-500/10' : 'text-text-secondary',
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
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isThinking}
              aria-label={t('agentSendMessage')}
              className={cn(
                'p-3 rounded-xl transition-all shrink-0',
                input.trim() && !isThinking
                  ? 'bg-brand-600 hover:bg-brand-500 text-white'
                  : 'bg-surface-hover text-text-muted cursor-not-allowed'
              )}
            >
              <Send className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {!embedded && (
          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <p className="text-[10px] text-text-muted text-center w-full sm:text-left sm:w-auto">
              {lang === 'el' ? 'Πηγή' : 'Source'}: {activeSourceLabel}
              {' · '}
              {ui.sourceModeFooter(activeSourceMode)}
              {' · '}
              <button
                type="button"
                onClick={handleNoAnswerHint}
                disabled={isThinking}
                className="text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-50"
              >
                {ui.noAnswerHint}
              </button>
              {' · '}
              {ui.shiftEnter}
            </p>
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
        className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-brand-300 transition-colors"
      >
        <FileText className="w-3 h-3" />
        {citations.length} {citations.length === 1 ? ui.citationSingular : ui.citationPlural} · {ui.citationToggle}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {citations.map((c) => (
            <div key={c.chunkId} className="rounded-lg border border-border-subtle bg-surface-primary/40 px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] text-brand-300 font-medium min-w-0">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{c.fileName}</span>
                  <span className="text-text-muted">· {c.locator}</span>
                  {c.heading && <span className="text-text-muted truncate">· {c.heading}</span>}
                </div>
                {onGoToSource && (
                  <GoToSourceButton lang={lang} onClick={() => onGoToSource(spanFromCitation(c))} />
                )}
              </div>
              <p className="text-[11px] text-text-tertiary mt-0.5 leading-snug">{c.snippet}</p>
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
}: {
  message: AgentMessage;
  onGoToSource?: (highlight: { fileId: string; charStart: number; charEnd: number }) => void;
  lang?: 'en' | 'el';
  ui: AgentUiCopy;
}) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="text-center">
        <span className="text-xs text-text-muted px-3 py-1 rounded-full bg-surface-hover inline-block">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-teal flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={cn(
        'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'agent-user-bubble text-white rounded-tr-md'
          : 'bg-surface-card border border-border-subtle rounded-tl-md'
      )}>
        <div>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <RichText text={message.content || (message.isStreaming ? '…' : '')} />
          )}
          {message.isStreaming && message.content && (
            <span className="inline-block w-0.5 h-4 bg-brand-400 animate-pulse ml-0.5 align-middle" />
          )}
        </div>

        {message.citations && message.citations.length > 0 ? (
          <CitationList citations={message.citations} onGoToSource={onGoToSource} lang={lang} ui={ui} />
        ) : message.sourceReference ? (
          <div className={cn(
            'mt-2 pt-2 border-t flex items-center gap-1.5 text-xs',
            isUser ? 'border-white/20 text-white/70' : 'border-border-subtle text-text-tertiary'
          )}>
            <FileText className="w-3 h-3" />
            {message.sourceReference}
          </div>
        ) : null}

        {message.metadata?.groundingFaithfulness !== undefined && (
          <p
            className={cn(
              'mt-1.5 text-[10px]',
              message.metadata.groundingVerified ? 'text-accent-emerald' : 'text-text-muted',
            )}
            data-testid="agent-faithfulness-score"
          >
            {ui.faithfulnessScore.replace(
              '{pct}',
              String(Math.round(message.metadata.groundingFaithfulness * 100)),
            )}
          </p>
        )}

        {message.metadata?.groundingVerified === true && (
          <p className="mt-1.5 text-[10px] text-accent-emerald">{ui.groundingVerified}</p>
        )}
        {message.metadata?.groundingVerified === false && (
          <p className="mt-1.5 text-[10px] text-accent-amber flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {ui.groundingWarning}
          </p>
        )}

        {(message.metadata?.groundingClaims?.length ?? 0) > 0 && (
          <div
            className="mt-2 rounded-lg border border-border-subtle bg-surface-primary/40 px-2.5 py-2 space-y-2"
            data-testid="agent-grounding-claims"
          >
            {message.metadata!.groundingClaims!.map((detail) => (
              <div
                key={detail.claim.slice(0, 64)}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-[10px]',
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
                      className="text-brand-700 hover:text-brand-800 font-medium shrink-0"
                      onClick={() => onGoToSource(detail.source!)}
                    >
                      {ui.viewSourceForClaim}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {message.metadata?.ungroundedClaims && message.metadata.ungroundedClaims.length > 0
          && !(message.metadata.groundingClaims?.length) && (
          <div
            className="mt-2 rounded-lg border border-accent-amber/25 bg-accent-amber/5 px-2.5 py-2"
            data-testid="agent-ungrounded-claims"
          >
            <p className="text-[10px] font-medium text-accent-amber mb-1">{ui.ungroundedClaimsHeading}</p>
            <ul className="space-y-1 text-[10px] text-text-secondary list-disc pl-4">
              {message.metadata.ungroundedClaims.slice(0, 3).map((claim) => (
                <li key={claim.slice(0, 48)}>{claim}</li>
              ))}
            </ul>
            {onGoToSource && message.citations?.[0] && (
              <button
                type="button"
                className="mt-2 text-[10px] text-brand-700 hover:text-brand-800 font-medium"
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

        {/* Source attribution labels */}
        {!isUser && message.metadata && (
          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center gap-2 flex-wrap">
            {message.metadata.sourceGrounded && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald font-medium">{ui.badgeSourceGrounded}</span>
            )}
            {message.metadata.inferenceUsed && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 font-medium">{ui.badgeAiInference}</span>
            )}
            {message.metadata.enrichmentUsed && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber font-medium">{ui.badgeEnrichment}</span>
            )}
            {message.metadata.globalRag && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan font-medium">{ui.badgeGlobalRag}</span>
            )}
            {message.metadata.graphRag && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-200 font-medium">{ui.badgeGraphRag}</span>
            )}
            {message.metadata.globalRag === false && message.metadata.sourceGrounded && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted font-medium">{ui.badgeLocalRag}</span>
            )}
            {message.metadata.lowRetrieval && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-rose/10 text-accent-rose font-medium">{ui.badgeLowRetrieval}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

