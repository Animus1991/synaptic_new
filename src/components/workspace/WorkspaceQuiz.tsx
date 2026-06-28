import { useMemo, useState, type KeyboardEvent } from 'react';
import { cn } from '../../utils/cn';
import { isMcQuiz, type QuizDef } from '../../lib/lessonTypes';
import type { Lang } from '../../lib/i18n';
import { useI18n } from '../../lib/i18n';
import type { QuizIrtDisplay } from '../../lib/quizIrt';
import { formatQuizIrtForLearner } from '../../lib/quizIrt';

type Props = {
  quizDef: QuizDef;
  lang: Lang;
  irt?: QuizIrtDisplay;
  irtResponseCount?: number;
  onComplete: (correct: boolean) => void;
  onQuestionSelect?: (question: string) => void;
};

function questionProps(question: string, onQuestionSelect?: (q: string) => void) {
  if (!onQuestionSelect) {
    return { className: 'text-sm mb-3' };
  }
  return {
    className: 'text-sm mb-3 rounded-lg border border-transparent px-1 py-0.5 cursor-pointer hover:border-accent-cyan/30 hover:bg-accent-cyan/5 transition-colors',
    role: 'button' as const,
    tabIndex: 0,
    'data-testid': 'quiz-question-select',
    onClick: () => onQuestionSelect(question),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onQuestionSelect(question);
      }
    },
  };
}

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function WorkspaceQuiz({ quizDef, lang, irt, irtResponseCount = 0, onComplete, onQuestionSelect }: Props) {
  const { t } = useI18n();
  const [mcAnswer, setMcAnswer] = useState<number | null>(null);
  const [shortText, setShortText] = useState('');
  const [shortChecked, setShortChecked] = useState<boolean | null>(null);
  const [order, setOrder] = useState<number[]>(() =>
    quizDef.kind === 'ordering' ? quizDef.items.map((_, i) => i) : [],
  );
  const [orderChecked, setOrderChecked] = useState<boolean | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [matchChecked, setMatchChecked] = useState<boolean | null>(null);

  const shuffledRight = useMemo(() => {
    if (quizDef.kind !== 'matching') return [];
    return quizDef.right.map((label, i) => ({ label, orig: i }));
  }, [quizDef]);

  if (isMcQuiz(quizDef)) {
    const passed = mcAnswer !== null && mcAnswer === quizDef.correctIndex;
    return (
      <div className="space-y-3" data-testid="workspace-quiz">
        {irt && (() => {
          const copy = formatQuizIrtForLearner(irt, lang, irtResponseCount);
          return (
          <div
            className="rounded-lg border border-border-subtle bg-surface-primary/40 px-2.5 py-1.5 text-[10px] text-text-muted space-y-0.5"
            data-testid="quiz-irt-badge"
          >
            <p className="text-text-secondary">{copy.readinessLabel}</p>
            <p>{copy.difficultyLabel} · {copy.probabilityLabel}</p>
            {copy.hint && <p className="ws-caption text-text-muted">{copy.hint}</p>}
          </div>
          );
        })()}
        <p {...questionProps(quizDef.question, onQuestionSelect)}>{quizDef.question}</p>
        {quizDef.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setMcAnswer(i);
              onComplete(i === quizDef.correctIndex);
            }}
            className={cn(
              'w-full text-left p-2.5 rounded-lg border text-sm mb-1.5 transition-all flex items-center gap-2',
              mcAnswer === i
                ? i === quizDef.correctIndex
                  ? 'border-accent-emerald/50 bg-accent-emerald/10 text-accent-emerald'
                  : 'border-accent-rose/50 bg-accent-rose/10 text-accent-rose'
                : 'border-border-subtle hover:border-white/20 hover:bg-white/[0.03]',
            )}
          >
            <span className="w-5 h-5 rounded-full border border-current/30 flex items-center justify-center text-[10px] shrink-0">
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
          </button>
        ))}
        {mcAnswer !== null && (
          <p className={cn('text-xs mt-2', passed ? 'text-accent-emerald' : 'text-accent-rose')}>
            {passed ? t('quizWkCorrectContinue') : t('quizWkReviewMaterial')}
          </p>
        )}
      </div>
    );
  }

  if (quizDef.kind === 'short-answer') {
    const sa = quizDef;
    const check = () => {
      const ok = sa.acceptedAnswers.some(
        (a: string) => normalizeAnswer(a) === normalizeAnswer(shortText),
      );
      setShortChecked(ok);
      onComplete(ok);
    };
    return (
      <div className="space-y-3" data-testid="workspace-quiz">
        {irt && (() => {
          const copy = formatQuizIrtForLearner(irt, lang, irtResponseCount);
          return (
          <div className="text-[10px] text-text-muted space-y-0.5" data-testid="quiz-irt-badge">
            <p>{copy.readinessLabel} · {copy.probabilityLabel}</p>
          </div>
          );
        })()}
        <p {...questionProps(sa.question, onQuestionSelect)}>{sa.question}</p>
        {sa.hint && <p className="text-xs text-text-muted">{sa.hint}</p>}
        <input
          type="text"
          value={shortText}
          onChange={(e) => { setShortText(e.target.value); setShortChecked(null); }}
          className="w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 text-sm"
          placeholder={t('quizWkYourAnswer')}
        />
        <button
          type="button"
          onClick={check}
          disabled={!shortText.trim()}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-40"
        >
          {t('quizWkCheck')}
        </button>
        {shortChecked !== null && (
          <p className={cn('text-xs', shortChecked ? 'text-accent-emerald' : 'text-accent-rose')}>
            {shortChecked ? t('quizWkCorrectShort') : t('quizWkTryAgain')}
          </p>
        )}
      </div>
    );
  }

  if (quizDef.kind === 'ordering') {
    const ord = quizDef;
    const move = (from: number, dir: -1 | 1) => {
      const next = order.slice();
      const to = from + dir;
      if (to < 0 || to >= next.length) return;
      [next[from], next[to]] = [next[to]!, next[from]!];
      setOrder(next);
      setOrderChecked(null);
    };
    const checkOrder = () => {
      const ok = order.every((v, i) => v === ord.correctOrder[i]);
      setOrderChecked(ok);
      onComplete(ok);
    };
    return (
      <div className="space-y-3">
        <p {...questionProps(ord.question, onQuestionSelect)}>{ord.question}</p>
        <ul className="space-y-2">
          {order.map((itemIdx, pos) => (
            <li key={itemIdx} className="flex items-center gap-2 p-2 rounded-lg border border-border-subtle bg-surface-card text-sm">
              <span className="text-text-muted w-5">{pos + 1}.</span>
              <span className="flex-1">{ord.items[itemIdx]}</span>
              <button type="button" onClick={() => move(pos, -1)} className="px-2 py-0.5 text-xs rounded border border-white/10">↑</button>
              <button type="button" onClick={() => move(pos, 1)} className="px-2 py-0.5 text-xs rounded border border-white/10">↓</button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={checkOrder} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">
          {t('quizWkCheckOrder')}
        </button>
        {orderChecked !== null && (
          <p className={cn('text-xs', orderChecked ? 'text-accent-emerald' : 'text-accent-rose')}>
            {orderChecked ? '✓' : '✗'} {orderChecked ? t('quizWkCorrectOrder') : t('quizWkWrongOrder')}
          </p>
        )}
      </div>
    );
  }

  if (quizDef.kind === 'matching') {
    const match = quizDef;
    const checkMatch = () => {
      const ok = match.pairs.every(([l, r]) => matches[l] === r);
      setMatchChecked(ok);
      onComplete(ok);
    };
    return (
      <div className="space-y-3">
        <p {...questionProps(match.question, onQuestionSelect)}>{match.question}</p>
        <div className="grid gap-2">
          {match.left.map((left, li) => (
            <div key={li} className="flex items-center gap-2 text-sm">
              <span className="flex-1 p-2 rounded-lg bg-surface-card border border-border-subtle">{left}</span>
              <select
                value={matches[li] ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value);
                  setMatches((m) => {
                    const next = { ...m };
                    if (v === undefined) delete next[li];
                    else next[li] = v;
                    return next;
                  });
                  setMatchChecked(null);
                }}
                className="flex-1 rounded-lg border border-border-subtle bg-surface-primary px-2 py-2 text-sm"
              >
                <option value="">{t('quizWkSelectOption')}</option>
                {shuffledRight.map(({ label, orig }) => (
                  <option key={orig} value={orig}>{label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={checkMatch}
          disabled={Object.keys(matches).length < match.left.length}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-40"
        >
          {t('quizWkCheckMatches')}
        </button>
        {matchChecked !== null && (
          <p className={cn('text-xs', matchChecked ? 'text-accent-emerald' : 'text-accent-rose')}>
            {matchChecked ? '✓' : '✗'} {matchChecked ? t('quizWkMatchCorrect') : t('quizWkMatchIncorrect')}
          </p>
        )}
      </div>
    );
  }

  return null;
}
