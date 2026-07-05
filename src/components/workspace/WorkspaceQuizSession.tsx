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
import type { Course } from '../../types';
import { buildGroundedQuizFeedback, type GroundedQuizFeedback } from '../../lib/quizGroundedFeedback';
import { quizCorrectAnswerText } from '../../lib/quizRemediation';
import {
  buildQuizWrongItemSummaries,
  quizWrongAnswerHint,
} from '../../lib/quizSelectionRemediationQA';
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
  onSessionComplete: (summary: { accuracy: number; meanConfidence: number }) => void;
  sectionLabel?: string;
  onOpenFlashcards?: () => void;
  onOpenFeynman?: () => void;
  onOpenReader?: () => void;
  onOpenQuestionInReader?: (query: string) => void;
  onRemediateWrong?: (kind: 'make-card' | 'feynman', item: QuizSessionItem) => void;
  /** §13.5 — select question/passage for unified action bar */
  onSelectPassage?: (text: string, term?: string) => void;
  onClearSelection?: () => void;
  onQuestionSelect?: (question: string) => void;
  course?: Course | null;
  onGroundedFeedbackFocus?: (feedback: GroundedQuizFeedback) => void;
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
  onSelectPassage,
  onClearSelection,
  onQuestionSelect,
  course = null,
  onGroundedFeedbackFocus,
}: Props) {
  const { t } = useI18n();
  const [session, setSession] = useState<QuizSessionState>(() => {
    const prev = loadQuizSession(scopeKey, concept);
    if (prev && prev.items.length === items.length) return prev;
    return initQuizSession(scopeKey, concept, items);
  });
  const [confidence, setConfidence] = useState(3);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

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

  const confirmAndAdvance = () => {
    if (lastCorrect === null) return;
    const next = recordSessionAnswer(session, lastCorrect, confidence);
    setSession(next);
    setLastCorrect(null);
    setConfidence(3);
    onClearSelection?.();
    if (next.completedAt) {
      onSessionComplete({
        accuracy: sessionAccuracy(next),
        meanConfidence: meanConfidence(next),
      });
    }
  };

  useEffect(() => {
    if (lastCorrect !== false || !current || !onSelectPassage) return;
    onSelectPassage(quizItemQuestion(current), concept);
  }, [lastCorrect, current, concept, onSelectPassage]);

  useEffect(() => {
    if (lastCorrect !== false || !groundedFeedback || !onGroundedFeedbackFocus) return;
    onGroundedFeedbackFocus(groundedFeedback);
  }, [lastCorrect, groundedFeedback, onGroundedFeedbackFocus]);

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
    return (
      <div className="space-y-3" data-testid="quiz-session-complete">
        <p className="text-sm font-semibold text-accent-emerald">{summary.headline}</p>
        <p className="text-xs text-text-secondary" data-testid="quiz-session-summary-detail">{summary.detail}</p>
        {irt && (
          <QuizIrtBadge irt={irt} lang={lang} responseCount={irtResponseCount} />
        )}
        {summary.suggestion && (
          <p className="text-[10px] text-brand-800" data-testid="quiz-session-summary-suggestion">{summary.suggestion}</p>
        )}
        {wrongSummaries.length > 0 && (
          <div
            className="rounded-xl border border-accent-rose/25 bg-accent-rose/5 p-3 space-y-2"
            data-testid="quiz-session-wrong-review"
          >
            <p className="text-[10px] font-medium text-accent-rose">
              {wrongSummaries.length === 1
                ? t('quizSessMistakesReviewOne')
                : t('quizSessMistakesReviewMany').replace('{count}', String(wrongSummaries.length))}
            </p>
            <ul className="space-y-2">
              {wrongSummaries.map((w) => {
                const item = session.items.find((i) => i.id === w.itemId);
                if (!item) return null;
                return (
                <li key={w.itemId} className="rounded-lg border border-white/8 bg-surface-primary/40 p-2">
                  <p className="text-[10px] text-text-secondary line-clamp-2">{w.question}</p>
                  <p className="mt-1 text-[9px] text-accent-emerald">{w.correctAnswer}</p>
                  {onRemediateWrong && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        data-testid={`quiz-review-make-card-${w.itemId}`}
                        onClick={() => onRemediateWrong('make-card', item)}
                        className="rounded border border-brand-500/30 bg-brand-600/10 px-2 py-0.5 text-[9px] text-brand-800"
                      >
                        {t('quizSessCard')}
                      </button>
                      <button
                        type="button"
                        data-testid={`quiz-review-feynman-${w.itemId}`}
                        onClick={() => onRemediateWrong('feynman', item)}
                        className="rounded border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-0.5 text-[9px] text-brand-800"
                      >
                        Feynman
                      </button>
                      {onOpenQuestionInReader && (
                        <button
                          type="button"
                          data-testid={`quiz-review-reader-${w.itemId}`}
                          onClick={() => onOpenQuestionInReader(w.question)}
                          className="rounded border border-white/10 px-2 py-0.5 text-[9px] text-text-secondary hover:text-brand-800"
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
              className="rounded-lg border border-brand-500/30 bg-brand-600/10 px-3 py-1.5 text-[10px] font-medium text-brand-800"
            >
              {t('quizSessReviewFlashcards')}
            </button>
          )}
          {accuracy < 70 && onOpenFeynman && (
            <button
              type="button"
              data-testid="quiz-open-feynman"
              onClick={onOpenFeynman}
              className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 text-[10px] font-medium text-brand-800"
            >
              {t('quizSessFeynmanExplain')}
            </button>
          )}
          {onOpenReader && (
            <button
              type="button"
              data-testid="quiz-open-reader"
              onClick={onOpenReader}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-medium text-text-secondary hover:text-brand-800"
            >
              {t('quizSessBackToReader')}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4" data-testid="quiz-session">
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>
          {t('quizSessQuestionLabel')} {session.currentIndex + 1}/{session.items.length}
        </span>
        <span data-testid="quiz-session-progress">
          {Math.round((session.currentIndex / session.items.length) * 100)}%
        </span>
      </div>

      {irt && (
        <QuizIrtBadge irt={irt} lang={lang} responseCount={irtResponseCount} compact />
      )}

      {current.sourceCitation && onOpenQuestionInReader && (
        <SourceCitationChip
          citation={current.sourceCitation}
          onOpenInReader={onOpenQuestionInReader}
        />
      )}

      {current.provenance && (
        <span
          className="inline-flex rounded-full border border-brand-500/25 bg-brand-600/10 px-2 py-0.5 text-[9px] font-medium text-brand-800"
          data-testid="quiz-provenance-badge"
        >
          {t(provenanceLabelKey(current.provenance) as never)}
        </span>
      )}

      {lastCorrect === null ? (
        <WorkspaceQuiz
          quizDef={current.quiz}
          lang={lang}
          irt={irt}
          irtResponseCount={irtResponseCount}
          onComplete={(correct) => setLastCorrect(correct)}
          onQuestionSelect={onQuestionSelect}
        />
      ) : (
        <div className="space-y-3">
          <p className={cn('text-xs', lastCorrect ? 'text-accent-emerald' : 'text-accent-rose')}>
            {lastCorrect ? t('quizSessCorrectConfidence') : t('quizSessReviewConfidence')}
          </p>
          {lastCorrect === false && (
            <div
              className="rounded-xl border border-accent-rose/25 bg-accent-rose/5 p-3 space-y-2"
              data-testid="quiz-wrong-remediation"
            >
              <p className="text-[10px] font-medium text-accent-rose">
                {t('quizSessFixMistake')}
              </p>
              <p className="text-[10px] text-text-secondary" data-testid="quiz-wrong-answer-hint">
                {quizWrongAnswerHint(current, concept, lang)}
              </p>
              {groundedFeedback && (
                <div className="space-y-1.5" data-testid="quiz-grounded-feedback">
                  <p className="text-[10px] text-text-secondary italic">
                    {groundedFeedback.message}
                  </p>
                  {groundedFeedback.sourceExcerpt && onOpenQuestionInReader && (
                    <button
                      type="button"
                      data-testid="quiz-grounded-open-reader"
                      onClick={() => onOpenQuestionInReader(groundedFeedback.sourceExcerpt ?? concept)}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[9px] font-medium text-brand-800 hover:opacity-90"
                    >
                      {t('quizGroundedViewSource')}
                    </button>
                  )}
                </div>
              )}
              {onRemediateWrong && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="quiz-remediate-make-card"
                    onClick={() => onRemediateWrong('make-card', current)}
                    className="rounded-lg border border-brand-500/30 bg-brand-600/10 px-3 py-1.5 text-[10px] font-medium text-brand-800 hover:bg-brand-600/20"
                  >
                    {t('quizSessMakeCardFromMistake')}
                  </button>
                  <button
                    type="button"
                    data-testid="quiz-remediate-feynman"
                    onClick={() => onRemediateWrong('feynman', current)}
                    className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 text-[10px] font-medium text-brand-800 hover:opacity-90"
                  >
                    {t('quizSessFeynmanExplain')}
                  </button>
                  {onOpenQuestionInReader && (
                    <button
                      type="button"
                      data-testid="quiz-remediate-reader"
                      onClick={() => onOpenQuestionInReader(quizItemQuestion(current))}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-medium text-text-secondary hover:border-brand-600/35 hover:text-brand-800"
                    >
                      {t('panelOpenReader')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="rounded-xl border border-border-subtle bg-surface-primary/50 p-3" data-testid="quiz-confidence-rating">
            <p className="text-[10px] font-medium text-text-muted mb-2">
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
                    confidence === n ? 'border-brand-500 bg-brand-600/20 text-brand-200' : 'border-border-subtle text-text-muted',
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
