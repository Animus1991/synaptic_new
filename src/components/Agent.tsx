import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, BookOpen, Brain, GraduationCap, MessageSquare,
  Code, Lightbulb, AlertTriangle, Mic, Volume2, ChevronDown,
  RotateCcw, Target, PenTool, Smile, Search, FileText,
  HelpCircle, Zap, Settings2
} from '@/lib/lucide-shim';
import type { AgentMessage, AgentMode, Course, UserSettings, UploadedFile, MessageCitation } from '../types';
import { cn } from '../utils/cn';
import { streamAgentReply, isLlmAvailable } from '../lib/llmClient';
import { buildSourceExcerpt, retrieveForQueryHybrid } from '../lib/sourceContext';
import { buildAgentRetrievalQuery, buildAgentContextSystemBlock, type AgentWorkspaceContext } from '../lib/agentWorkspaceContext';
import { spanFromCitation } from '../lib/conceptProvenance';
import { verifyGrounding } from '../lib/groundingVerifier';
import { emitAnalyticsLearningEvent } from '../lib/emitLearningEvent';
import { formatCitation } from '../lib/rag';
import { GoToSourceButton } from './GoToSourceButton';
import { AgentContextBanner } from './AgentContextBanner';
import { RichText } from './RichText';
import { getAgentContent, type AgentUiCopy } from '../lib/agentContent';
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
}: AgentProps) {
  const [input, setInput] = useState('');
  const [showModes, setShowModes] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [attachSource, setAttachSource] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
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
  const { quickActions, ui } = agentContent;
  const sourceExcerpt = attachSource
    ? buildSourceExcerpt(
        uploadedFiles,
        workspaceContext?.concept ?? activeTaskConcept,
        workspaceContext?.courseId ?? (selectedSource === 'all' ? undefined : selectedSource),
      )
    : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendRef = useRef<(overrideText?: string) => Promise<void>>(async () => {});

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isThinking) return;
    const msg: AgentMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    onSendMessage(msg);
    setInput('');
    setShowQuickActions(false);
    setIsThinking(true);

    const retrievalQuery = buildAgentRetrievalQuery(text, workspaceContext ?? undefined);
    const ragConcept = workspaceContext?.concept ?? activeTaskConcept;
    const ragCourseId =
      workspaceContext?.courseId ?? (selectedSource === 'all' ? undefined : selectedSource);

    const retrieval = attachSource
      ? await retrieveForQueryHybrid(uploadedFiles, retrievalQuery, settings, {
          concept: ragConcept,
          courseId: ragCourseId,
        })
      : { excerpt: undefined, citations: [], grounded: false };

    const queryExcerpt = retrieval.excerpt ?? sourceExcerpt;
    const contextBlock = buildAgentContextSystemBlock(workspaceContext, lang);

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
      },
    });

    setIsThinking(false);

    const { content, usedLlm, sourceGrounded } = await streamAgentReply(
      contextBlock ? `${contextBlock}\n\n${text}` : text,
      mode,
      settings,
      {
        taskTitle: workspaceContext?.stepTitle ?? activeTaskTitle,
        concept: ragConcept,
        courses: courses.map((c) => c.title),
        sourceExcerpt: queryExcerpt,
      },
      (full) => onUpdateMessage(streamId, { content: full }),
    );

    const citationLine = retrieval.citations.length > 0
      ? retrieval.citations.slice(0, 3).map(formatCitation).join('  ·  ')
      : undefined;

    const strictGrounding =
      settings?.sourceMode === 'strict' || settings?.sourceMode === 'notes-only';
    const grounding = strictGrounding
      ? verifyGrounding(content, retrieval.citations, { strict: true })
      : null;
    if (grounding) {
      emitAnalyticsLearningEvent('grounding_checked', {
        verified: grounding.verified,
        coverage: Math.round(grounding.coverage * 100) / 100,
        unattributed: grounding.unattributedCount,
      });
    }

    onUpdateMessage(streamId, {
      content,
      isStreaming: false,
      sourceReference: citationLine,
      citations: retrieval.citations,
      metadata: {
        sourceGrounded: retrieval.grounded || sourceGrounded || (mode !== 'motivation' && !!queryExcerpt),
        enrichmentUsed: settings?.sourceMode === 'enriched' && !retrieval.grounded,
        inferenceUsed: usedLlm,
        groundingVerified: grounding?.verified,
        groundingCoverage: grounding?.coverage,
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

  const currentMode = agentModes.find(m => m.mode === mode)!;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)]">
      {/* Agent Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-border-subtle bg-surface-secondary/30">
        <div className="flex items-center justify-between max-w-none w-full min-w-0 ws-bento-soft px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="ws-serif text-sm font-medium text-text-primary">{ui.title}</span>
                <button
                  onClick={() => setShowModes(!showModes)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-surface-hover border border-border-subtle hover:border-brand-500/30 transition-all"
                >
                  <currentMode.icon className={cn('w-3 h-3', currentMode.color)} />
                  {currentMode.label}
                  <ChevronDown className={cn('w-3 h-3 transition-transform', showModes && 'rotate-180')} />
                </button>
              </div>
              <p className="text-xs text-text-tertiary">
                {llmReady ? ui.llmConnected : ui.offlineMode}
                {sourceExcerpt ? ui.sourceAttached : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="text-xs bg-surface-input border border-border-subtle rounded-lg px-2 py-1.5 text-text-secondary focus:outline-none focus:border-brand-500/50"
            >
              <option value="all">{ui.allSources}</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button
              type="button"
              aria-label={lang === 'el' ? 'Ρυθμίσεις πηγών' : 'Source settings'}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-tertiary"
            >
              <Settings2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <AgentContextBanner context={workspaceContext} lang={lang} />

      {activeTaskTitle && (
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

      {/* Mode Selector Dropdown */}
      <AnimatePresence>
        {showModes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border-subtle bg-surface-secondary/50 overflow-hidden"
          >
            <div className="max-w-none w-full min-w-0 px-4 sm:px-6 py-4">
              <PlatformSection title={ui.agentModeHeading} padding="none" tone="muted">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-3">
                {agentModes.map(m => (
                  <button
                    key={m.mode}
                    onClick={() => { onChangeMode(m.mode); setShowModes(false); }}
                    className={cn(
                      'ws-bento-soft p-2.5 text-left transition-all',
                      mode === m.mode
                        ? 'border-brand-500/35 text-brand-700'
                        : 'hover:border-brand-500/25',
                    )}
                  >
                    <m.icon className={cn('w-4 h-4 mb-1', m.color)} />
                    <p className="text-xs font-medium">{m.label}</p>
                    <p className="text-[10px] text-text-tertiary">{m.desc}</p>
                  </button>
                ))}
              </div>
              </PlatformSection>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-none w-full min-w-0 px-4 sm:px-6 py-4 space-y-4">
          {messages.length === 0 && !isThinking && (
            <PlatformEmptyState
              title={ui.title}
              description={llmReady ? ui.inputPlaceholder : ui.offlineMode}
              icon={Sparkles}
              actionLabel={quickActions[0]}
              onAction={() => handleQuickAction(quickActions[0])}
              secondaryActionLabel={quickActions[1]}
              onSecondaryAction={() => handleQuickAction(quickActions[1])}
            />
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

          {/* Quick Actions */}
          {showQuickActions && messages.length <= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4"
            >
              <p className="text-xs text-text-tertiary mb-3">{ui.quickActionsHeading}</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map(action => (
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
      <div className="border-t border-border-subtle bg-surface-secondary/30 pb-20 lg:pb-0">
        <div className="max-w-none w-full min-w-0 px-4 sm:px-6 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
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
                  aria-label={lang === 'el' ? 'Αναζήτηση στις πηγές' : 'Search sources'}
                  className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={lang === 'el' ? 'Επισύναψη αρχείου' : 'Attach file'}
                  className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isThinking}
              aria-label={lang === 'el' ? 'Αποστολή μηνύματος' : 'Send message'}
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

          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[10px] text-text-muted flex-wrap">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                {ui.sourceGroundedBadge}
              </span>
              <span>•</span>
              <span>{currentMode.label} {ui.modeSuffix}</span>
              <span>•</span>
              <button className="text-brand-400 hover:text-brand-300 transition-colors">
                {ui.noAnswerHint}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setAttachSource((v) => !v)}
                className={cn(
                  'text-text-muted hover:text-text-secondary transition-colors',
                  attachSource && sourceExcerpt && 'text-brand-400',
                )}
              >
                {attachSource ? ui.sourceOn : ui.sourceOff}
              </button>
            </div>
            <span className="text-[10px] text-text-muted">{ui.shiftEnter}</span>
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

        {message.metadata?.groundingVerified === true && (
          <p className="mt-1.5 text-[10px] text-accent-emerald">{ui.groundingVerified}</p>
        )}
        {message.metadata?.groundingVerified === false && (
          <p className="mt-1.5 text-[10px] text-accent-amber flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {ui.groundingWarning}
          </p>
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
          </div>
        )}
      </div>
    </motion.div>
  );
}

