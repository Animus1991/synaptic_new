import { useCallback, useMemo, useState } from 'react';
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
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
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

/* Wave QZ / OPT-K153 — question-first; wash chrome; text-first filters */
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
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden" data-testid="quiz-panel" data-clarity-pass="k159">
      <div className="shrink-0 border-b border-transparent px-4 pt-2.5 pb-1.5">
        {session.sectionLabel && (
          <p className="type-caption text-text-muted" data-testid="quiz-section-label">
            {t('wsSectionColon')}{' '}
            <span className="font-medium text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}
        {/* OPT-K159 — item count lives in session progress (avoids 1 ερώτηση + Ερώτηση 1 από 1) */}
        <span className="sr-only" data-testid="quiz-item-count">
          {session.items.length}{' '}
          {session.items.length === 1 ? t('panelQuestion') : t('panelQuestions')}
        </span>

        {artifactStale && onAcknowledgeStale && (
          <div className="mt-2">
            <ArtifactStaleBanner lang={lang} tool="quiz" onDismiss={onAcknowledgeStale} />
          </div>
        )}

        <QuizSelectionContractStrip report={selectionContractReport} lang={lang} />

        {(session.weakExtraction || session.passageGrounded) && (
          <div className="mt-2">
            <WorkspacePanelWarnStrip testId="quiz-weak-extraction">
              {session.passageGrounded
                ? t('panelPassageGroundedQuiz')
                : t('panelWeakExtractionQuiz')}
            </WorkspacePanelWarnStrip>
          </div>
        )}
      </div>

      <CollapsibleChromeSection
        title={t('quizFiltersChrome')}
        alwaysCollapse
        data-testid="quiz-filters-chrome"
      >
        <div className="space-y-2 px-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[140px] max-w-md flex-1">
              <label className="sr-only" htmlFor="quiz-filter-input">
                {t('panelSearchQuestions')}
              </label>
              <input
                id="quiz-filter-input"
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t('panelSearchQuestions')}
                className="w-full min-h-8 rounded-lg border-0 bg-surface-secondary/55 py-1.5 px-2.5 type-caption text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35"
                data-testid="quiz-filter"
              />
            </div>
            {onOpenInReader && (
              <button
                type="button"
                onClick={() => onOpenInReader(concept)}
                className="ws-touch-floor inline-flex min-h-8 items-center rounded-lg border-0 bg-surface-secondary/55 px-2.5 py-1 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                data-testid="quiz-open-reader"
              >
                {t('quizOpenReader')}
              </button>
            )}
          </div>

          {filterQuery.trim() && filterMatches.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-testid="quiz-filter-matches">
              {filterMatches.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (onSelectionAction ? selectQuestion(item) : onOpenInReader?.(quizItemQuestion(item)))}
                  className="max-w-full rounded-lg border-0 bg-surface-secondary/55 px-2.5 py-1 text-left type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                >
                  <span className="line-clamp-2 whitespace-normal break-words">
                    {quizItemQuestion(item)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </CollapsibleChromeSection>

      {selectedPassage && onSelectionAction && (
        <div className="px-4 pt-2">
          <WorkspaceSelectionActionBar
            lang={lang}
            excerpt={selectedPassage.text}
            originTool="quiz"
            onAction={handleSelectionAction}
            onDismiss={() => {
              setSelectedPassage(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="mb-0 rounded-xl border-0 bg-surface-secondary/40"
            data-testid="quiz-selection-actions"
          />
        </div>
      )}

      <div
        className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto px-4 py-3"
        onMouseUp={captureTextSelection}
        data-testid="quiz-session-scroll"
      >
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
