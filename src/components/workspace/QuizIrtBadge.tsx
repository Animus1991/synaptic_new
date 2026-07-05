import type { Lang } from '../../lib/i18n';
import {
  buildQuizIrtConfidenceBand,
  formatQuizIrtForLearner,
  type QuizIrtDisplay,
} from '../../lib/quizIrt';
import { QuizIrtConfidenceBand } from './QuizIrtConfidenceBand';

type Props = {
  irt: QuizIrtDisplay;
  lang: Lang;
  responseCount?: number;
  compact?: boolean;
};

export function QuizIrtBadge({ irt, lang, responseCount = 0, compact = false }: Props) {
  const copy = formatQuizIrtForLearner(irt, lang, responseCount);
  const band = buildQuizIrtConfidenceBand(irt, responseCount, lang);

  return (
    <div
      className="rounded-lg border border-border-subtle bg-surface-primary/40 px-2.5 py-2 text-[10px] text-text-muted space-y-1.5"
      data-testid="quiz-irt-badge"
    >
      {!compact && (
        <>
          <p className="text-text-secondary font-medium">{copy.readinessLabel}</p>
          <p>{copy.difficultyLabel}</p>
        </>
      )}
      <QuizIrtConfidenceBand band={band} />
      {!compact && copy.hint && <p className="text-text-muted">{copy.hint}</p>}
    </div>
  );
}
