import { useState } from 'react';
import { cn } from '../../utils/cn';
import type { QuizIrtDisplay } from '../../lib/quizIrt';
import type { QuizSessionItem, QuizSessionState } from '../../lib/quizSession';
import {
  initQuizSession,
  loadQuizSession,
  meanConfidence,
  recordSessionAnswer,
  sessionAccuracy,
} from '../../lib/quizSession';
import { WorkspaceQuiz } from './WorkspaceQuiz';

type Props = {
  scopeKey: string;
  concept: string;
  items: QuizSessionItem[];
  lang: 'en' | 'el';
  irt?: QuizIrtDisplay;
  onSessionComplete: (summary: { accuracy: number; meanConfidence: number }) => void;
};

export function WorkspaceQuizSession({ scopeKey, concept, items, lang, irt, onSessionComplete }: Props) {
  const [session, setSession] = useState<QuizSessionState>(() => {
    const prev = loadQuizSession(scopeKey, concept);
    if (prev && prev.items.length === items.length && !prev.completedAt) return prev;
    return initQuizSession(scopeKey, concept, items);
  });
  const [confidence, setConfidence] = useState(3);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const current = session.items[session.currentIndex];
  const done = Boolean(session.completedAt) || session.currentIndex >= session.items.length;

  const confirmAndAdvance = () => {
    if (lastCorrect === null) return;
    const next = recordSessionAnswer(session, lastCorrect, confidence);
    setSession(next);
    setLastCorrect(null);
    setConfidence(3);
    if (next.completedAt) {
      onSessionComplete({
        accuracy: sessionAccuracy(next),
        meanConfidence: meanConfidence(next),
      });
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        {lang === 'el' ? 'Δεν δημιουργήθηκαν ερωτήσεις από τις σημειώσεις.' : 'No questions generated from your notes.'}
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-3" data-testid="quiz-session-complete">
        <p className="text-sm font-semibold text-accent-emerald">
          {lang === 'el' ? 'Ολοκληρώθηκε η συνεδρία κουίζ' : 'Quiz session complete'}
        </p>
        <p className="text-xs text-text-secondary">
          {lang === 'el' ? 'Ακρίβεια' : 'Accuracy'}: {sessionAccuracy(session)}% ·
          {lang === 'el' ? ' μέση εμπιστοσύνη' : ' mean confidence'}: {meanConfidence(session).toFixed(1)}/5
        </p>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4" data-testid="quiz-session">
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>
          {lang === 'el' ? 'Ερώτηση' : 'Question'} {session.currentIndex + 1}/{session.items.length}
        </span>
        <span data-testid="quiz-session-progress">
          {Math.round((session.currentIndex / session.items.length) * 100)}%
        </span>
      </div>

      {lastCorrect === null ? (
        <WorkspaceQuiz
          quizDef={current.quiz}
          lang={lang}
          irt={irt}
          onComplete={(correct) => setLastCorrect(correct)}
        />
      ) : (
        <div className="space-y-3">
          <p className={cn('text-xs', lastCorrect ? 'text-accent-emerald' : 'text-accent-rose')}>
            {lastCorrect
              ? (lang === 'el' ? '✓ Σωστά — βαθμολόγησε την εμπιστοσύνη σου' : '✓ Correct — rate your confidence')
              : (lang === 'el' ? '✗ Δες ξανά — βαθμολόγησε την εμπιστοσύνη σου' : '✗ Review — rate your confidence')}
          </p>
          <div className="rounded-xl border border-border-subtle bg-surface-primary/50 p-3" data-testid="quiz-confidence-rating">
            <p className="text-[10px] font-medium text-text-muted mb-2">
              {lang === 'el' ? 'Εμπιστοσύνη (1–5)' : 'Confidence (1–5)'}
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
            {session.currentIndex + 1 >= session.items.length
              ? (lang === 'el' ? 'Ολοκλήρωση συνεδρίας' : 'Finish session')
              : (lang === 'el' ? 'Επόμενη ερώτηση' : 'Next question')}
          </button>
        </div>
      )}
    </div>
  );
}
