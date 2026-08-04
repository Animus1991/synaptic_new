import { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import type { QuizIrtDisplay } from '../../lib/quizIrt';
import { QuizIrtBadge } from './QuizIrtBadge';
import type { QuizSessionItem, QuizSessionState } from '../../lib/quizSession';
import {
  initQuizSession,
  loadQuizSession,
  meanConfidence,
  recordSessionAnswer,
  sessionAccuracy,
} from '../../lib/quizSession';
import { buildQuizSessionSummaryCopy } from '../../lib/quizSessionSummaryCopy';
import { quizItemQuestion } from '../../lib/quizSessionModel';
import type { Course, UserSettings } from '../../types';
import { buildGroundedQuizFeedback, type GroundedQuizFeedback } from '../../lib/quizGroundedFeedback';
import { quizCorrectAnswerText } from '../../lib/quizRemediation';
import {
  buildQuizWrongItemSummaries,
  quizWrongAnswerHint,
} from '../../lib/quizSelectionRemediationQA';
import {
  diagnoseQuizError,
  quizErrorKindLabel,
  type QuizErrorDiagnosis,
} from '../../lib/quizErrorDiagnosis';
import { WorkspaceQuiz } from './WorkspaceQuiz';
import { useI18n } from '../../lib/i18n';
import { SourceCitationChip } from './SourceCitationChip';
import { provenanceLabelKey } from '../../lib/examPrep/quizProvenance';

type Props = {
  scopeKey: string;
  concept: string;
  items: QuizSessionItem[];
  lang: 'en' | 'el';
  irt?: QuizIrtDisplay;
  irtResponseCount?: number;
  onSessionComplete: (summary: {
    accuracy: number;
    meanConfidence: number;
    wrongCount: number;
    itemCount: number;
  }) => void;
  sectionLabel?: string;
  onOpenFlashcards?: () => void;
  onOpenFeynman?: () => void;
  onOpenReader?: () => void;
  onOpenQuestionInReader?: (query: string) => void;
  onRemediateWrong?: (kind: 'make-card' | 'feynman', item: QuizSessionItem) => void;
  /** Open Feynman with combined prompt for all wrong answers (TOOL-QZ-02). */
  onRemediateWrongCluster?: (items: QuizSessionItem[]) => void;
  attemptHistory?: Array<{ accuracy: number; completedAt: string; wrongCount: number }>;
  /** §13.5 — select question/passage for unified action bar */
  onSelectPassage?: (text: string, term?: string) => void;
  onClearSelection?: () => void;
  onQuestionSelect?: (question: string) => void;
  course?: Course | null;
  onGroundedFeedbackFocus?: (feedback: GroundedQuizFeedback) => void;
  /** OPT-AI-A — settings for optional LLM diagnosis (offline heuristic always). */
  userSettings?: UserSettings;
  onDiagnosisReady?: (diagnosis: QuizErrorDiagnosis, item: QuizSessionItem) => void;
};

export function WorkspaceQuizSession({
  scopeKey,
  concept,
  items,
  lang,
  irt,
  irtResponseCount = 0,
  onSessionComplete,
  sectionLabel,
  onOpenFlashcards,
  onOpenFeynman,
  onOpenReader,
  onOpenQuestionInReader,
  onRemediateWrong,
  onRemediateWrongCluster,
  attemptHistory = [],
  onSelectPassage,
  onClearSelection,
  onQuestionSelect,
  course = null,
  onGroundedFeedbackFocus,
  userSettings,
  onDiagnosisReady,
}: Props) {
  const { t } = useI18n();
  const [session, setSession] = useState<QuizSessionState>(() => {
    const prev = loadQuizSession(scopeKey, concept);
    if (prev && prev.items.length === items.length) return prev;
    return initQuizSession(scopeKey, concept, items);
  });
  const [confidence, setConfidence] = useState(3);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [diagnosis, setDiagnosis] = useState<QuizErrorDiagnosis | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const prev = loadQuizSession(scopeKey, concept);
    if (prev && prev.items.length === items.length) {
      setSession(prev);
      return;
    }
    setSession(initQuizSession(scopeKey, concept, items));
  }, [scopeKey, concept, items]);

  const current = session.items[session.currentIndex];
  const groundedFeedback =
    lastCorrect === false && current
      ? buildGroundedQuizFeedback(
        course,
        concept,
        quizCorrectAnswerText(current.quiz, concept),
        lang,
      )
      : null;
  const done = Boolean(session.completedAt) || session.currentIndex >= session.items.length;

  useEffect(() => {
    if (lastCorrect !== false || !groundedFeedback || !onGroundedFeedbackFocus) return;
    onGroundedFeedbackFocus(groundedFeedback);
  }, [lastCorrect, groundedFeedback, onGroundedFeedbackFocus]);

  useEffect(() => {
    if (lastCorrect !== false || !current) {
      setDiagnosis(null);
      return;
    }
    let cancelled = false;
    setDiagnosisLoading(true);
    void diagnoseQuizError({
      item: current,
      concept,
      learnerConfidence: confidence,
      lang,
      settings: userSettings,
      sourceExcerpt: groundedFeedback?.sourceExcerpt,
    }).then((result) => {
      if (cancelled) return;
      setDiagnosis(result.data);
      setDiagnosisLoading(false);
      onDiagnosisReady?.(result.data, current);
    }).catch(() => {
      if (!cancelled) setDiagnosisLoading(false);
    });
    return () => { cancelled = true; };
  }, [lastCorrect, current, concept, confidence, lang, userSettings, groundedFeedback?.sourceExcerpt, onDiagnosisReady]);

  useEffect(() => {
    if (lastCorrect !== false || !current || !onSelectPassage) return;
    onSelectPassage(quizItemQuestion(current), concept);
  }, [lastCorrect, current, concept, onSelectPassage]);

  useEffect(() => {
    if (lastCorrect !== false || !groundedFeedback || !onGroundedFeedbackFocus) return;
    onGroundedFeedbackFocus(groundedFeedback);
  }, [lastCorrect, groundedFeedback, onGroundedFeedbackFocus]);

  const confirmAndAdvance = () => {
    if (lastCorrect === null) return;
    const next = recordSessionAnswer(session, lastCorrect, confidence);
    setSession(next);
    setLastCorrect(null);
    setConfidence(3);
    setDiagnosis(null);
    onClearSelection?.();
    if (next.completedAt) {
      const wrongCount = next.correctFlags.filter((c) => c === false).length;
      onSessionComplete({
        accuracy: sessionAccuracy(next),
        meanConfidence: meanConfidence(next),
        wrongCount,
        itemCount: next.items.length,
      });
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        {t('quizSessNoQuestions')}
      </p>
    );
  }

  if (done) {
    const accuracy = sessionAccuracy(session);
    const confidence = meanConfidence(session);
    const summary = buildQuizSessionSummaryCopy(accuracy, confidence, lang);
    const wrongSummaries = buildQuizWrongItemSummaries(session, sectionLabel);
    const wrongItems = session.items.filter((_item, i) => session.correctFlags[i] === false);
    return (
      <div className="ux-tier-b-tool ux-tier-b-quiz-session space-y-3" data-testid="quiz-session-complete">
        <p className="text-sm font-semibold text-accent-emerald ink-allow-accent">{summary.headline}</p>
        <p className="text-xs text-text-secondary" data-testid="quiz-session-summary-detail">{summary.detail}</p>
        {attemptHistory.length > 0 && (
          <p className="type-caption text-text-muted" data-testid="quiz-attempt-history-hint">
            {t('quizAttemptHistoryHint').replace('{count}', String(attemptHistory.length))}
          </p>
        )}
        {irt && (
          <QuizIrtBadge irt={irt} lang={lang} responseCount={irtResponseCount} />
        )}
        {summary.suggestion && (
          <p className="type-caption text-text-secondary" data-testid="quiz-session-summary-suggestion">{summary.suggestion}</p>
        )}
        {wrongSummaries.length > 0 && (
          <div
            className="rounded-xl border border-accent-rose/25 bg-accent-rose/5 p-3 space-y-2"
            data-testid="quiz-session-wrong-review"
          >
            <p className="type-caption font-medium text-accent-rose ink-allow-accent">
              {wrongSummaries.length === 1
                ? t('quizSessMistakesReviewOne')
                : t('quizSessMistakesReviewMany').replace('{count}', String(wrongSummaries.length))}
            </p>
            {wrongItems.length > 0 && onRemediateWrongCluster && (
              <button
                type="button"
                data-testid="quiz-review-feynman-cluster"
                onClick={() => onRemediateWrongCluster(wrongItems)}
                className="mb-2 inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-secondary px-2.5 py-1 type-caption font-medium text-text-secondary hover:text-text-primary"
              >
                {t('quizSessFeynmanCluster')}
              </button>
            )}
            <ul className="space-y-2">
              {wrongSummaries.map((w) => {
                const item = session.items.find((i) => i.id === w.itemId);
                if (!item) return null;
                return (
                <li key={w.itemId} className="rounded-lg border border-border-subtle bg-surface-primary/40 p-2">
                  <p className="type-caption text-text-secondary line-clamp-2">{w.question}</p>
                  <p className="mt-1 type-caption text-accent-emerald ink-allow-accent">{w.correctAnswer}</p>
                  {onRemediateWrong && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        data-testid={`quiz-review-make-card-${w.itemId}`}
                        onClick={() => onRemediateWrong('make-card', item)}
                        className="rounded border border-border-subtle bg-surface-secondary px-2 py-0.5 type-caption text-text-secondary"
                      >
                        {t('quizSessCard')}
                      </button>
                      <button
                        type="button"
                        data-testid={`quiz-review-feynman-${w.itemId}`}
                        onClick={() => onRemediateWrong('feynman', item)}
                        className="rounded border border-border-subtle bg-surface-secondary px-2 py-0.5 type-caption text-text-secondary"
                      >
                        Feynman
                      </button>
                      {onOpenQuestionInReader && (
                        <button
                          type="button"
                          data-testid={`quiz-review-reader-${w.itemId}`}
                          onClick={() => onOpenQuestionInReader(w.question)}
                          className="rounded border border-border-subtle px-2 py-0.5 type-caption text-text-secondary hover:text-text-primary"
                        >
                          {t('toolReader')}
                        </button>
                      )}
                    </div>
                  )}
                </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {accuracy < 70 && onOpenFlashcards && (
            <button
              type="button"
              data-testid="quiz-open-flashcards"
              onClick={onOpenFlashcards}
              className="rounded-lg border border-border-subtle bg-surface-secondary px-3 py-1.5 type-caption font-medium text-text-secondary"
            >
              {t('quizSessReviewFlashcards')}
            </button>
          )}
          {accuracy < 70 && onOpenFeynman && (
            <button
              type="button"
              data-testid="quiz-open-feynman"
              onClick={onOpenFeynman}
              className="rounded-lg border border-border-subtle bg-surface-secondary px-3 py-1.5 type-caption font-medium text-text-secondary"
            >
              {t('quizSessFeynmanExplain')}
            </button>
          )}
          {onOpenReader && (
            <button
              type="button"
              data-testid="quiz-open-reader"
              onClick={onOpenReader}
              className="rounded-lg border border-border-subtle px-3 py-1.5 type-caption font-medium text-text-secondary hover:text-text-primary"
            >
              {t('quizSessBackToReader')}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!current) return null;

  const progressPct = Math.round((session.currentIndex / session.items.length) * 100);

  return (
    <div className="ux-tier-b-tool ux-tier-b-quiz-session space-y-4" data-testid="quiz-session">
      {/* Wave E6 — one progress strip + one IRT meta strip (not repeated under options) */}
      <div className="space-y-2" data-testid="quiz-session-meta">
        <div className="ux-quiz-session-header flex items-center justify-between gap-2 type-caption text-text-secondary">
          <span className="font-medium text-text-primary">
            {t('quizMetaProgress')
              .replace('{current}', String(session.currentIndex + 1))
              .replace('{total}', String(session.items.length))}
          </span>
          <span data-testid="quiz-session-progress" className="font-mono text-text-muted">
            {progressPct}%
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-secondary"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label={t('quizMetaProgress')
            .replace('{current}', String(session.currentIndex + 1))
            .replace('{total}', String(session.items.length))}
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {irt && (
          <QuizIrtBadge irt={irt} lang={lang} responseCount={irtResponseCount} />
        )}
      </div>

      {current.sourceCitation && onOpenQuestionInReader && (
        <SourceCitationChip
          citation={current.sourceCitation}
          onOpenInReader={onOpenQuestionInReader}
        />
      )}

      {current.provenance && (
        <span
          className="inline-flex rounded-lg border border-border-subtle bg-surface-secondary px-2 py-0.5 type-caption font-medium text-text-secondary"
          data-testid="quiz-provenance-badge"
        >
          {t(provenanceLabelKey(current.provenance) as never)}
        </span>
      )}

      {lastCorrect === null ? (
        <WorkspaceQuiz
          quizDef={current.quiz}
          lang={lang}
          showIrtBadge={false}
          onComplete={(correct) => setLastCorrect(correct)}
          onQuestionSelect={onQuestionSelect}
        />
      ) : (
        <div className="space-y-3">
          <p className={cn('text-xs ink-allow-accent', lastCorrect ? 'text-accent-emerald' : 'text-accent-rose')}>
            {lastCorrect ? t('quizSessCorrectConfidence') : t('quizSessReviewConfidence')}
          </p>
          {lastCorrect === false && (
            <div
              className="rounded-xl border border-accent-rose/25 bg-accent-rose/5 p-3 space-y-2"
              data-testid="quiz-wrong-remediation"
            >
              <p className="type-caption font-medium text-accent-rose ink-allow-accent">
                {t('quizSessFixMistake')}
              </p>
              <p className="type-caption text-text-secondary" data-testid="quiz-wrong-answer-hint">
                {quizWrongAnswerHint(current, concept, lang)}
              </p>
              {groundedFeedback && (
                <div className="space-y-1.5" data-testid="quiz-grounded-feedback">
                  <p className="type-caption text-text-secondary italic">
                    {groundedFeedback.message}
                  </p>
                  {groundedFeedback.sourceExcerpt && onOpenQuestionInReader && (
                    <button
                      type="button"
                      data-testid="quiz-grounded-open-reader"
                      onClick={() => onOpenQuestionInReader(groundedFeedback.sourceExcerpt ?? concept)}
                      className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-secondary px-2 py-0.5 type-caption font-medium text-text-secondary hover:text-text-primary"
                    >
                      {t('quizGroundedViewSource')}
                    </button>
                  )}
                </div>
              )}
              {(diagnosis || diagnosisLoading) && (
                <div
                  className="rounded-lg border border-border-subtle bg-surface-secondary/40 px-2.5 py-2 space-y-1"
                  data-testid="quiz-error-diagnosis"
                >
                  <p className="type-caption font-semibold text-text-primary">
                    {t('quizErrorDiagnosisTitle')}
                    {diagnosis ? (
                      <span className="ml-1.5 font-normal text-text-secondary">
                        · {quizErrorKindLabel(diagnosis.kind, lang)}
                      </span>
                    ) : null}
                  </p>
                  <p className="type-caption text-text-secondary">
                    {diagnosisLoading && !diagnosis
                      ? t('quizErrorDiagnosisLoading')
                      : diagnosis?.summary}
                  </p>
                </div>
              )}
              {onRemediateWrong && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="quiz-remediate-make-card"
                    onClick={() => onRemediateWrong('make-card', current)}
                    className="rounded-lg border border-border-subtle bg-surface-secondary px-3 py-1.5 type-caption font-medium text-text-secondary hover:text-text-primary"
                  >
                    {t('quizSessMakeCardFromMistake')}
                  </button>
                  <button
                    type="button"
                    data-testid="quiz-remediate-feynman"
                    onClick={() => onRemediateWrong('feynman', current)}
                    className="rounded-lg border border-border-subtle bg-surface-secondary px-3 py-1.5 type-caption font-medium text-text-secondary hover:text-text-primary"
                  >
                    {t('quizSessFeynmanExplain')}
                  </button>
                  {onOpenQuestionInReader && (
                    <button
                      type="button"
                      data-testid="quiz-remediate-reader"
                      onClick={() => onOpenQuestionInReader(quizItemQuestion(current))}
                      className="rounded-lg border border-border-subtle px-3 py-1.5 type-caption font-medium text-text-secondary hover:text-text-primary"
                    >
                      {t('panelOpenReader')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="ux-tier-b-panel rounded-xl border border-border-subtle bg-surface-primary/50 p-3" data-testid="quiz-confidence-rating">
            <p className="type-caption font-medium text-text-muted mb-2">
              {t('quizSessConfidenceScale')}
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  data-testid={`quiz-confidence-${n}`}
                  onClick={() => setConfidence(n)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-medium border',
                    confidence === n
                      ? 'border-brand-500 bg-brand-600/20 text-text-primary'
                      : 'border-border-subtle text-text-muted',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            data-testid="quiz-session-confirm"
            onClick={confirmAndAdvance}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm"
          >
            {session.currentIndex + 1 >= session.items.length ? t('quizSessFinishSession') : t('quizSessNextQuestion')}
          </button>
        </div>
      )}
    </div>
  );
}
