import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Search } from '@/lib/lucide-shim';
import type { QuizIrtDisplay } from '../../lib/quizIrt';
import type { QuizSessionContent } from '../../lib/quizSessionModel';
import { filterQuizItems, quizItemQuestion } from '../../lib/quizSessionModel';
import type { QuizSessionItem } from '../../lib/quizSession';
import { loadQuizSession } from '../../lib/quizSession';
import { auditQuizSelectionRemediation } from '../../lib/quizSelectionRemediationQA';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { WorkspaceQuizSession } from './WorkspaceQuizSession';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { QuizSelectionContractStrip } from './QuizSelectionContractStrip';
import { ArtifactStaleBanner } from './ArtifactStaleBanner';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';
import type { Course } from '../../types';
import type { GroundedQuizFeedback } from '../../lib/quizGroundedFeedback';
import { useI18n } from '../../lib/i18n';

type Props = {
  session: QuizSessionContent;
  concept: string;
  lang: 'en' | 'el';
  scopeKey: string;
  course?: Course | null;
  irt?: QuizIrtDisplay;
  irtResponseCount?: number;
  emptyMessage?: string;
  onUpload?: () => void;
  onSessionComplete: (summary: {
    accuracy: number;
    meanConfidence: number;
    wrongCount: number;
    itemCount: number;
  }) => void;
  onOpenFlashcards?: () => void;
  onOpenFeynman?: () => void;
  onOpenInReader?: (query: string) => void;
  onRemediateWrong?: (kind: 'make-card' | 'feynman', item: QuizSessionItem) => void;
  onRemediateWrongCluster?: (items: QuizSessionItem[]) => void;
  attemptHistory?: Array<{ accuracy: number; completedAt: string; wrongCount: number }>;
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  onGroundedFeedbackFocus?: (feedback: GroundedQuizFeedback) => void;
  artifactStale?: boolean;
  onAcknowledgeStale?: () => void;
  userSettings?: import('../../types').UserSettings;
  onDiagnosisReady?: (diagnosis: import('../../lib/quizErrorDiagnosis').QuizErrorDiagnosis, item: QuizSessionItem) => void;
};

export function QuizPanel({
  session,
  concept,
  lang,
  scopeKey,
  irt,
  irtResponseCount = 0,
  emptyMessage,
  onUpload,
  onSessionComplete,
  onOpenFlashcards,
  onOpenFeynman,
  onOpenInReader,
  onRemediateWrong,
  onRemediateWrongCluster,
  attemptHistory,
  onSelectionAction,
  onGroundedFeedbackFocus,
  course = null,
  artifactStale = false,
  onAcknowledgeStale,
  userSettings,
  onDiagnosisReady,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedPassage, setSelectedPassage] = useState<{ text: string; term: string } | null>(null);
  const { t } = useI18n();

  const selectPassage = useCallback((text: string, term?: string) => {
    if (!onSelectionAction) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSelectedPassage({ text: trimmed, term: term?.trim() || concept });
  }, [onSelectionAction, concept]);

  const captureTextSelection = useCallback(() => {
    if (!onSelectionAction) return;
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length >= 8) selectPassage(sel);
  }, [onSelectionAction, selectPassage]);

  const handleSelectionAction = useCallback((action: WorkspaceSelectionActionId) => {
    if (!selectedPassage || !onSelectionAction) return;
    onSelectionAction(action, {
      text: selectedPassage.text,
      term: selectedPassage.term,
      sectionLabel: session.sectionLabel,
      originTool: 'quiz',
    });
    setSelectedPassage(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedPassage, onSelectionAction, session.sectionLabel]);

  const selectQuestion = useCallback((item: QuizSessionItem) => {
    selectPassage(quizItemQuestion(item), concept);
  }, [selectPassage, concept]);

  const filterMatches = useMemo(
    () => filterQuizItems(session.items, filterQuery),
    [session.items, filterQuery],
  );

  const selectionContractReport = useMemo(() => {
    const persisted = loadQuizSession(scopeKey, concept);
    return auditQuizSelectionRemediation({
      lang,
      session: persisted,
      concept,
      sectionLabel: session.sectionLabel,
    });
  }, [lang, scopeKey, concept, session.sectionLabel, session.items.length]);

  if (!session.hasSource) {
    return (
      <WorkspaceToolEmptyState
        tool="quiz"
        concept={concept}
        message={emptyMessage}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  if (session.items.length === 0) {
    return (
      <div className="p-4" data-testid="quiz-panel-empty">
        <WorkspaceToolEmptyState
          tool="quiz"
          concept={concept}
          message={emptyMessage}
          hasSource
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-4" data-testid="quiz-panel">
      {session.sectionLabel && (
        <p className="mb-2 text-[10px] text-text-muted" data-testid="quiz-section-label">
          {t('wsSectionColon')}{' '}
          <span className="text-text-secondary">{session.sectionLabel}</span>
        </p>
      )}

      {artifactStale && onAcknowledgeStale && (
        <ArtifactStaleBanner lang={lang} tool="quiz" onDismiss={onAcknowledgeStale} />
      )}

      <QuizSelectionContractStrip report={selectionContractReport} lang={lang} />

      {(session.weakExtraction || session.passageGrounded) && (
        <WorkspacePanelWarnStrip testId="quiz-weak-extraction">
          {session.passageGrounded
            ? t('panelPassageGroundedQuiz')
            : t('panelWeakExtractionQuiz')}
        </WorkspacePanelWarnStrip>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t('panelSearchQuestions')}
            className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
            data-testid="quiz-filter"
          />
        </div>
        <span className="text-[10px] text-text-muted">
          {session.items.length} {t('panelQuestions')}
        </span>
        {onOpenInReader && (
          <button
            type="button"
            onClick={() => onOpenInReader(concept)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-brand-600/35 hover:text-brand-800"
            data-testid="quiz-open-reader"
          >
            <BookOpen className="w-3 h-3" />
            Reader
          </button>
        )}
      </div>

      {filterQuery.trim() && filterMatches.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5" data-testid="quiz-filter-matches">
          {filterMatches.slice(0, 4).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => (onSelectionAction ? selectQuestion(item) : onOpenInReader?.(quizItemQuestion(item)))}
              className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 text-[10px] text-brand-800 hover:opacity-90"
            >
              {quizItemQuestion(item).slice(0, 56)}
              {quizItemQuestion(item).length > 56 ? '…' : ''}
            </button>
          ))}
        </div>
      )}

      {selectedPassage && onSelectionAction && (
        <WorkspaceSelectionActionBar
          lang={lang}
          excerpt={selectedPassage.text}
          originTool="quiz"
          onAction={handleSelectionAction}
          onDismiss={() => {
            setSelectedPassage(null);
            window.getSelection()?.removeAllRanges();
          }}
          className="mb-3 rounded-xl border border-accent-cyan/20"
          data-testid="quiz-selection-actions"
        />
      )}

      <div className="flex-1 min-h-0 overflow-y-auto" onMouseUp={captureTextSelection}>
        <WorkspaceQuizSession
          scopeKey={scopeKey}
          concept={concept}
          items={session.items}
          lang={lang}
          sectionLabel={session.sectionLabel}
          irt={irt}
          irtResponseCount={irtResponseCount}
          onSessionComplete={onSessionComplete}
          onOpenFlashcards={onOpenFlashcards}
          onOpenFeynman={onOpenFeynman}
          onOpenReader={onOpenInReader ? () => onOpenInReader(concept) : undefined}
          onOpenQuestionInReader={onOpenInReader}
          onRemediateWrong={onRemediateWrong}
          onRemediateWrongCluster={onRemediateWrongCluster}
          attemptHistory={attemptHistory}
          onSelectPassage={onSelectionAction ? selectPassage : undefined}
          onClearSelection={() => setSelectedPassage(null)}
          onQuestionSelect={onSelectionAction ? (question) => selectPassage(question, concept) : undefined}
          course={course}
          onGroundedFeedbackFocus={onGroundedFeedbackFocus}
          userSettings={userSettings}
          onDiagnosisReady={onDiagnosisReady}
        />
      </div>
    </div>
  );
}
