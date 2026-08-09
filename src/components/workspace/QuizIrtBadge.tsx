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
  /** @deprecated Wave E6 — badge is always one meta strip; kept for call-site compat. */
  compact?: boolean;
};

function stripPrefix(label: string, prefixes: string[]): string {
  for (const prefix of prefixes) {
    if (label.startsWith(prefix)) return label.slice(prefix.length).trim();
  }
  return label;
}

/**
 * Wave E6 — one plain-language meta strip (readiness · difficulty · success range).
 * Replaces the previous stacked Readiness / Difficulty / calibrating blocks.
 */
export function QuizIrtBadge({ irt, lang, responseCount = 0 }: Props) {
  const copy = formatQuizIrtForLearner(irt, lang, responseCount);
  const band = buildQuizIrtConfidenceBand(irt, responseCount, lang);

  const readiness = stripPrefix(copy.readinessLabel, ['Readiness:', 'Ετοιμότητα:', 'Level:', 'Επίπεδο:']);
  const difficulty = stripPrefix(copy.difficultyLabel, ['Difficulty:', 'Δυσκολία:']);
  const settling = band.tier === 'unknown';
  const metaLine = settling
    ? (lang === 'el'
      ? `Μαθαίνουμε το επίπεδό σου · ${difficulty} · ${band.rangeLabel}`
      : `Getting to know your level · ${difficulty} · ${band.rangeLabel}`)
    : `${readiness} · ${difficulty} · ${band.rangeLabel}`;

  return (
    <div
      className="rounded-md border-0 bg-surface-secondary/35 px-2.5 py-1.5 space-y-1"
      data-testid="quiz-irt-badge"
      data-clarity-pass="k159"
      role="status"
    >
      <p className="type-caption font-medium leading-snug text-text-secondary" data-testid="quiz-irt-meta-line">
        {metaLine}
      </p>
      <QuizIrtConfidenceBand band={band} hideLabels />
      {copy.hint && (
        <p className="type-caption text-text-muted">{copy.hint}</p>
      )}
    </div>
  );
}
