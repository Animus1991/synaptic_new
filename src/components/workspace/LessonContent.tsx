import { Sparkles } from 'lucide-react';
import { RichText } from '../RichText';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { LessonStepToolBar } from './LessonStepToolBar';
import { WorkspaceQuiz } from './WorkspaceQuiz';
import { WorkspaceQuizSession } from './WorkspaceQuizSession';
import type { QuizSessionItem } from '../../lib/quizSession';
import type { QuizDef } from '../../lib/lessonTypes';
import { getNoteContentForLessonStep } from '../../lib/groundedLesson';
import type { LessonStepKey } from '../../lib/domainContent';
import type { Lang } from '../../lib/i18n';

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
}: LessonContentProps) {
  const toolBar = hasSource ? (
    <LessonStepToolBar
      step={{ title: stepTitle ?? concept, type: stepType ?? '' }}
      stepIndex={step}
      stepCount={stepCount}
      activeTool={activeTool}
      onOpenTool={onOpenTool}
      lang={lang}
    />
  ) : null;

  const quizStepIndex = stepCount - 1;
  if (step === quizStepIndex && hasSource) {
    return (
      <div className="space-y-4">
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
        <span className="text-[10px] text-accent-cyan font-semibold uppercase tracking-wider">
          {lang === 'el' ? 'Από τις σημειώσεις σου' : 'From your notes'}
        </span>
        <h2 className="text-xl font-bold">{stepTitle ?? concept}</h2>
        {stepType && (
          <span className="text-[10px] text-text-muted">{stepType}</span>
        )}
        <div className="text-sm text-text-secondary leading-relaxed">
          <RichText text={chunk} />
        </div>
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
      {onUpload && (
        <button type="button" onClick={onUpload} className="mt-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-500">
          {lang === 'el' ? 'Ανέβασμα Υλικού' : 'Upload Material'}
        </button>
      )}
    </div>
  );
}
