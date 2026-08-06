import { useMemo, useState, type KeyboardEvent } from 'react';
import { HelpCircle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { isMcQuiz, type QuizDef } from '../../lib/lessonTypes';
import type { Lang } from '../../lib/i18n';
import { useI18n } from '../../lib/i18n';
import type { QuizIrtDisplay } from '../../lib/quizIrt';
import { QuizIrtBadge } from './QuizIrtBadge';

type Props = {
  quizDef: QuizDef;
  lang: Lang;
  irt?: QuizIrtDisplay;
  irtResponseCount?: number;
  /**
   * Wave E6 — when false, skip the IRT badge (parent session already shows one meta strip).
   * Default true for standalone quiz surfaces.
   */
  showIrtBadge?: boolean;
  onComplete: (correct: boolean) => void;
  onQuestionSelect?: (question: string) => void;
};

function questionProps(question: string, onQuestionSelect?: (q: string) => void) {
  if (!onQuestionSelect) {
    return { className: 'type-body mb-3' };
  }
  return {
    className: 'type-body mb-3 rounded-lg border border-transparent px-1 py-0.5 cursor-pointer hover:border-accent-cyan/30 hover:bg-accent-cyan/5 transition-colors',
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

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function WorkspaceQuiz({
  quizDef,
  lang,
  irt,
  irtResponseCount = 0,
  showIrtBadge = true,
  onComplete,
  onQuestionSelect,
}: Props) {
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
    if (quizDef.placeholder) {
      return (
        <div
          className="ux-tier-b-tool ux-tier-b-quiz rounded-xl border border-dashed border-border-default bg-surface-card/50 px-4 py-6 text-center"
          data-testid="workspace-quiz-empty"
        >
          <HelpCircle className="mx-auto mb-2 h-6 w-6 text-text-secondary" aria-hidden />
          <p className="type-meta font-medium text-text-secondary">{quizDef.question}</p>
          <p className="mx-auto mt-1.5 max-w-xs type-caption text-text-muted">{t('wsQuizEmptyHint')}</p>
        </div>
      );
    }
    const passed = mcAnswer !== null && mcAnswer === quizDef.correctIndex;
    return (
      <div className="ux-tier-b-tool ux-tier-b-quiz space-y-3" data-testid="workspace-quiz">
        {showIrtBadge && irt && (
          <QuizIrtBadge irt={irt} lang={lang} responseCount={irtResponseCount} />
        )}
        <p {...questionProps(quizDef.question, onQuestionSelect)}>{quizDef.question}</p>
        <div className="flex w-full min-w-0 flex-col gap-2" data-testid="quiz-mc-options" role="listbox" aria-label={quizDef.question}>
        {quizDef.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            role="option"
            aria-selected={mcAnswer === i}
            onClick={() => {
              setMcAnswer(i);
              onComplete(i === quizDef.correctIndex);
            }}
            className={cn(
              'ux-quiz-option ws-touch-floor flex w-full min-h-11 min-w-0 items-start gap-2.5 rounded-xl border p-3 text-left type-body transition-colors sm:p-3.5',
              mcAnswer === i
                ? i === quizDef.correctIndex
                  ? 'border-accent-emerald/40 bg-accent-emerald/8 text-text-primary'
                  : 'border-accent-rose/40 bg-accent-rose/8 text-text-primary'
                : 'border-border-subtle text-text-primary hover:border-border-default hover:bg-surface-hover',
            )}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle type-caption font-medium text-text-secondary">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0 flex-1 whitespace-normal break-words text-pretty leading-relaxed">
              {opt}
            </span>
          </button>
        ))}
        </div>
        {mcAnswer !== null && (
          <p className={cn('type-caption mt-2', passed ? 'text-accent-emerald' : 'text-accent-rose')}>
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
      <div className="ux-tier-b-tool ux-tier-b-quiz space-y-3" data-testid="workspace-quiz">
        {showIrtBadge && irt && (
          <QuizIrtBadge irt={irt} lang={lang} responseCount={irtResponseCount} />
        )}
        <p {...questionProps(sa.question, onQuestionSelect)}>{sa.question}</p>
        {sa.hint && <p className="type-caption text-text-muted">{sa.hint}</p>}
        <input
          type="text"
          value={shortText}
          onChange={(e) => { setShortText(e.target.value); setShortChecked(null); }}
          className="ux-tier-b-input w-full rounded-lg border border-border-subtle bg-surface-primary px-3 py-2 type-body"
          placeholder={t('quizWkYourAnswer')}
        />
        <button
          type="button"
          onClick={check}
          disabled={!shortText.trim()}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white type-meta font-medium disabled:opacity-40"
        >
          {t('quizWkCheck')}
        </button>
        {shortChecked !== null && (
          <p className={cn('type-caption', shortChecked ? 'text-accent-emerald' : 'text-accent-rose')}>
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
      <div className="ux-tier-b-tool ux-tier-b-quiz space-y-3">
        <p {...questionProps(ord.question, onQuestionSelect)}>{ord.question}</p>
        <ul className="space-y-2">
          {order.map((itemIdx, pos) => (
            <li key={itemIdx} className="ux-quiz-option flex items-center gap-2 p-2 rounded-lg border border-border-subtle bg-surface-card type-body">
              <span className="text-text-muted w-5">{pos + 1}.</span>
              <span className="flex-1">{ord.items[itemIdx]}</span>
              <button type="button" onClick={() => move(pos, -1)} className="px-2 py-0.5 type-caption rounded border border-white/10">↑</button>
              <button type="button" onClick={() => move(pos, 1)} className="px-2 py-0.5 type-caption rounded border border-white/10">↓</button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={checkOrder} className="px-4 py-2 rounded-lg bg-brand-600 text-white type-meta font-medium">
          {t('quizWkCheckOrder')}
        </button>
        {orderChecked !== null && (
          <p className={cn('type-caption', orderChecked ? 'text-accent-emerald' : 'text-accent-rose')}>
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
      <div className="ux-tier-b-tool ux-tier-b-quiz space-y-3">
        <p {...questionProps(match.question, onQuestionSelect)}>{match.question}</p>
        <div className="grid gap-2">
          {match.left.map((left, li) => (
            <div key={li} className="flex items-center gap-2 type-body">
              <span className="ux-tier-b-panel flex-1 p-2 rounded-lg bg-surface-card border border-border-subtle">{left}</span>
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
                className="ux-tier-b-input flex-1 rounded-lg border border-border-subtle bg-surface-primary px-2 py-2 type-body"
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
          className="px-4 py-2 rounded-lg bg-brand-600 text-white type-meta font-medium disabled:opacity-40"
        >
          {t('quizWkCheckMatches')}
        </button>
        {matchChecked !== null && (
          <p className={cn('type-caption', matchChecked ? 'text-accent-emerald' : 'text-accent-rose')}>
            {matchChecked ? '✓' : '✗'} {matchChecked ? t('quizWkMatchCorrect') : t('quizWkMatchIncorrect')}
          </p>
        )}
      </div>
    );
  }

  return null;
}
