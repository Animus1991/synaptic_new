import { useCallback, useState } from 'react';
import { Sparkles } from '@/lib/lucide-shim';
import { RichText } from '../RichText';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { LessonStepToolBar } from './LessonStepToolBar';
import { WorkspaceLearningActionBar } from './WorkspaceLearningActionBar';
import { WorkspaceQuiz } from './WorkspaceQuiz';
import { WorkspaceQuizSession } from './WorkspaceQuizSession';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import type { QuizSessionItem } from '../../lib/quizSession';
import type { QuizDef } from '../../lib/lessonTypes';
import { getNoteContentForLessonStep } from '../../lib/groundedLesson';
import type { LessonStepKey } from '../../lib/domainContent';
import type { Lang } from '../../lib/i18n';
import type { LearningActionId } from '../../lib/workspaceLearningActions';
import type { NextActionRecommendation } from '../../lib/nextActionEngine';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';

interface LessonContentProps {
  step: number;
  stepCount: number;
  stepTitle?: string;
  stepType?: string;
  concept: string;
  activeTool: WorkspaceToolId;
  onOpenTool: (tool: WorkspaceToolId) => void;
  onOpenAgent: () => void;
  quizDef: QuizDef;
  quizPassed: boolean;
  genStatus: 'idle' | 'loading' | 'ready' | 'fallback';
  noteExcerpt: string;
  hasSource: boolean;
  emptyMessage: string;
  onUpload?: () => void;
  onQuizComplete: (correct: boolean) => void;
  quizIrt?: any;
  quizSessionItems: QuizSessionItem[];
  quizSessionScopeKey: string;
  t: (key: string) => string;
  lang: Lang;
  onLearningAction?: (action: LearningActionId) => void;
  nextActionRecommendation?: NextActionRecommendation | null;
  onReprocess?: () => void;
  stepUnderstood?: boolean;
  stepConfusing?: boolean;
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  onRemediateWrong?: (kind: 'make-card' | 'feynman', item: QuizSessionItem) => void;
  sourceBestTool?: WorkspaceToolId | null;
}

export function LessonContent({
  step,
  stepCount,
  stepTitle,
  stepType,
  concept,
  activeTool,
  onOpenTool,
  quizDef,
  quizPassed,
  genStatus,
  noteExcerpt,
  hasSource,
  emptyMessage,
  onUpload,
  onQuizComplete,
  quizIrt,
  quizSessionItems,
  quizSessionScopeKey,
  t,
  lang,
  onLearningAction,
  nextActionRecommendation,
  onReprocess,
  stepUnderstood,
  stepConfusing,
  onSelectionAction,
  onRemediateWrong,
  sourceBestTool,
}: LessonContentProps) {
  const [textSelection, setTextSelection] = useState<string | null>(null);

  const captureSelection = useCallback(() => {
    if (!onSelectionAction) return;
    const sel = window.getSelection()?.toString().trim();
    setTextSelection(sel && sel.length >= 8 ? sel : null);
  }, [onSelectionAction]);

  const dismissSelection = useCallback(() => {
    setTextSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleSelectionAction = useCallback((action: WorkspaceSelectionActionId) => {
    if (!textSelection || !onSelectionAction) return;
    onSelectionAction(action, {
      text: textSelection,
      term: concept,
      sectionLabel: stepTitle ?? concept,
      originTool: activeTool,
    });
    dismissSelection();
  }, [textSelection, onSelectionAction, concept, stepTitle, activeTool, dismissSelection]);
  const learningBar = hasSource && onLearningAction ? (
    <WorkspaceLearningActionBar
      lang={lang}
      recommendation={nextActionRecommendation ?? null}
      onAction={onLearningAction}
      onReprocess={onReprocess}
      understood={stepUnderstood}
      confusing={stepConfusing}
    />
  ) : null;

  const toolBar = hasSource ? (
    <LessonStepToolBar
      step={{ title: stepTitle ?? concept, type: stepType ?? '' }}
      stepIndex={step}
      stepCount={stepCount}
      activeTool={activeTool}
      onOpenTool={onOpenTool}
      onLearningAction={onLearningAction}
      lang={lang}
      nextActionRecommendation={nextActionRecommendation}
      sourceBestTool={sourceBestTool}
    />
  ) : null;

  const quizStepIndex = stepCount - 1;
  if (step === quizStepIndex && hasSource) {
    return (
      <div className="space-y-4">
        {learningBar}
        <span className="text-[10px] text-accent-cyan font-semibold uppercase tracking-wider">{t('quiz')}</span>
        <h2 className="text-xl font-bold">{t('knowledgeCheck')}</h2>
        <div className="p-3 rounded-xl bg-surface-card border border-border-subtle">
          {quizSessionItems && quizSessionItems.length > 0 && quizSessionScopeKey ? (
            <WorkspaceQuizSession
              scopeKey={quizSessionScopeKey}
              concept={concept}
              items={quizSessionItems}
              lang={lang}
              irt={quizIrt}
              onSessionComplete={(summary) => onQuizComplete(summary.accuracy >= 60)}
              onRemediateWrong={onRemediateWrong}
            />
          ) : (
            <WorkspaceQuiz quizDef={quizDef} lang={lang} irt={quizIrt} onComplete={onQuizComplete} />
          )}
          {quizPassed && (
             <p className="text-xs mt-2 text-accent-emerald">✓ {t('canFinish')}</p>
          )}
        </div>
        {toolBar}
      </div>
    );
  }

  if (hasSource && noteExcerpt.trim()) {
    const keys: LessonStepKey[] = ['hook', 'prior', 'core', 'worked-example', 'practice', 'misconception', 'retrieval', 'summary'];
    const stepKey = keys[step % keys.length] ?? 'core';
    const chunk = getNoteContentForLessonStep(stepKey, noteExcerpt, concept, undefined, lang);
    return (
      <div className="space-y-4">
        {learningBar}
        <span className="text-[10px] text-accent-cyan font-semibold uppercase tracking-wider">
          {lang === 'el' ? 'Από τις σημειώσεις σου' : 'From your notes'}
        </span>
        <h2 className="text-xl font-bold">{stepTitle ?? concept}</h2>
        {stepType && (
          <span className="text-[10px] text-text-muted">{stepType}</span>
        )}
        <div
          className="text-sm text-text-secondary leading-relaxed"
          onMouseUp={onSelectionAction ? captureSelection : undefined}
        >
          <RichText text={chunk} />
        </div>
        {textSelection && onSelectionAction && (
          <WorkspaceSelectionActionBar
            lang={lang}
            excerpt={textSelection}
            originTool={activeTool}
            onAction={handleSelectionAction}
            onDismiss={dismissSelection}
            data-testid="lesson-selection-actions"
          />
        )}
        {genStatus === 'loading' && (
          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 font-medium animate-pulse">
            <Sparkles className="w-2.5 h-2.5" /> {lang === 'el' ? 'Δημιουργία από τις πηγές σου…' : 'Generating from your sources…'}
          </span>
        )}
        {toolBar}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center py-8">
      <p className="text-sm text-text-secondary">{emptyMessage}</p>
      {!hasSource && onUpload && (
        <button type="button" onClick={onUpload} className="mt-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-500">
          {lang === 'el' ? 'Ανέβασμα Υλικού' : 'Upload Material'}
        </button>
      )}
    </div>
  );
}
