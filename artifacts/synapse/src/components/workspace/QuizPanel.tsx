import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { QuizIrtDisplay } from '../../lib/quizIrt';
import type { QuizSessionContent } from '../../lib/quizSessionModel';
import { filterQuizItems, quizItemQuestion } from '../../lib/quizSessionModel';
import type { QuizSessionItem } from '../../lib/quizSession';
import { clearQuizSessions, loadQuizSession } from '../../lib/quizSession';
import { auditQuizSelectionRemediation } from '../../lib/quizSelectionRemediationQA';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { WorkspaceQuizSession } from './WorkspaceQuizSession';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import { QuizSelectionContractStrip } from './QuizSelectionContractStrip';
import { ArtifactStaleBanner } from './ArtifactStaleBanner';
import type {
  WorkspaceSelectionActionId,
  WorkspaceSelectionContext,
} from '../../lib/workspaceSelectionActions';

type Props = {
  session: QuizSessionContent;
  concept: string;
  lang: 'en' | 'el';
  scopeKey: string;
  irt?: QuizIrtDisplay;
  irtResponseCount?: number;
  emptyMessage?: string;
  onUpload?: () => void;
  onSessionComplete: (summary: { accuracy: number; meanConfidence: number }) => void;
  onOpenFlashcards?: () => void;
  onOpenFeynman?: () => void;
  onOpenInReader?: (query: string) => void;
  onRemediateWrong?: (kind: 'make-card' | 'feynman', item: QuizSessionItem) => void;
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  desiredCount: number;
  onChangeDesiredCount: (n: number) => void;
  countOptions: readonly number[];
  artifactStale?: boolean;
  onAcknowledgeStale?: () => void;
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
  onSelectionAction,
  desiredCount,
  onChangeDesiredCount,
  countOptions,
  artifactStale = false,
  onAcknowledgeStale,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedPassage, setSelectedPassage] = useState<{ text: string; term: string } | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const isEl = lang === 'el';

  const applyCount = useCallback((n: number) => {
    clearQuizSessions(scopeKey);
    onChangeDesiredCount(n);
    setPendingCount(null);
  }, [scopeKey, onChangeDesiredCount]);

  const handlePickCount = useCallback((n: number) => {
    if (n === desiredCount) { setPendingCount(null); return; }
    const live = loadQuizSession(scopeKey, concept);
    const inProgress = !!live && !live.completedAt && live.correctFlags.length > 0;
    if (inProgress) setPendingCount(n);
    else applyCount(n);
  }, [desiredCount, scopeKey, concept, applyCount]);

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
      <WorkspaceEmptyState
        message={emptyMessage ?? (isEl ? 'Ανέβασε σημειώσεις για κουίζ.' : 'Upload notes to quiz.')}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  if (session.items.length === 0) {
    return (
      <div className="p-4" data-testid="quiz-panel-empty">
        <WorkspaceEmptyState
          message={emptyMessage ?? (isEl
            ? 'Δεν δημιουργήθηκαν ερωτήσεις — δοκίμασε Reprocess ή ανέβασε πιο δομημένες σημειώσεις.'
            : 'No questions generated — try Reprocess or upload more structured notes.')}
          hasSource
          onUpload={onUpload}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-4" data-testid="quiz-panel">
      {session.sectionLabel && (
        <p className="mb-2 text-[10px] text-text-muted" data-testid="quiz-section-label">
          {isEl ? 'Ενότητα:' : 'Section:'}{' '}
          <span className="text-text-secondary">{session.sectionLabel}</span>
        </p>
      )}

      {artifactStale && onAcknowledgeStale && (
        <ArtifactStaleBanner lang={lang} tool="quiz" onDismiss={onAcknowledgeStale} />
      )}

      <QuizSelectionContractStrip report={selectionContractReport} lang={lang} />

      {(session.weakExtraction || session.passageGrounded) && (
        <div
          className="mb-3 flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
          data-testid="quiz-weak-extraction"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>
            {session.passageGrounded
              ? (isEl
                ? 'Οι ερωτήσεις προέρχονται από το απόσπασμα (generic concept) — Reprocess για πιο πλούσια δομή.'
                : 'Questions are passage-grounded (generic concept) — Reprocess for richer structure.')
              : (isEl
                ? 'Αδύναμη εξαγωγή — λίγοι όροι γλωσσαρίου. Δοκίμασε Reprocess.'
                : 'Weak extraction — sparse glossary. Try Reprocess.')}
          </p>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={isEl ? 'Αναζήτηση ερωτήσεων…' : 'Search questions…'}
            className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
            data-testid="quiz-filter"
          />
        </div>
        <div className="flex items-center gap-1" data-testid="quiz-count-selector">
          <span className="text-[10px] text-text-muted">{isEl ? 'Πλήθος:' : 'Length:'}</span>
          {countOptions.map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`quiz-count-${n}`}
              onClick={() => handlePickCount(n)}
              className={cn(
                'rounded px-2 py-0.5 text-[10px] border',
                n === desiredCount
                  ? 'border-brand-500 bg-brand-600/20 text-brand-200'
                  : 'border-border-subtle text-text-muted hover:text-text-secondary',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-text-muted" data-testid="quiz-count-actual">
          {session.items.length < desiredCount
            ? (isEl
              ? `${session.items.length} από ${desiredCount} ερωτήσεις`
              : `${session.items.length} of ${desiredCount} questions`)
            : `${session.items.length} ${isEl ? 'ερωτήσεις' : 'questions'}`}
        </span>
        {onOpenInReader && (
          <button
            type="button"
            onClick={() => onOpenInReader(concept)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-accent-cyan/35 hover:text-accent-cyan"
            data-testid="quiz-open-reader"
          >
            <BookOpen className="w-3 h-3" />
            Reader
          </button>
        )}
      </div>

      {pendingCount !== null && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
          data-testid="quiz-restart-confirm"
        >
          <span>
            {isEl
              ? `Συνεδρία σε εξέλιξη — επανεκκίνηση με ${pendingCount} ερωτήσεις; Η πρόοδος θα χαθεί.`
              : `Session in progress — restart with ${pendingCount} questions? Current progress will be lost.`}
          </span>
          <button
            type="button"
            data-testid="quiz-restart-apply"
            onClick={() => pendingCount !== null && applyCount(pendingCount)}
            className="rounded-lg border border-accent-rose/40 bg-accent-rose/10 px-2 py-0.5 text-accent-rose"
          >
            {isEl ? 'Επανεκκίνηση' : 'Restart'}
          </button>
          <button
            type="button"
            data-testid="quiz-restart-cancel"
            onClick={() => setPendingCount(null)}
            className="rounded-lg border border-border-subtle px-2 py-0.5 text-text-muted"
          >
            {isEl ? 'Άκυρο' : 'Cancel'}
          </button>
        </div>
      )}

      {filterQuery.trim() && filterMatches.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5" data-testid="quiz-filter-matches">
          {filterMatches.slice(0, 4).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => (onSelectionAction ? selectQuestion(item) : onOpenInReader?.(quizItemQuestion(item)))}
              className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 text-[9px] text-accent-cyan hover:bg-accent-cyan/15"
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
          onSelectPassage={onSelectionAction ? selectPassage : undefined}
          onClearSelection={() => setSelectedPassage(null)}
          onQuestionSelect={onSelectionAction ? (question) => selectPassage(question, concept) : undefined}
        />
      </div>
    </div>
  );
}
