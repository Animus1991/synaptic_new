import { masteryBand, bandColor } from '../../lib/pedagogy';
import { cn } from '../../utils/cn';

interface ConceptBar {
  concept: string;
  mastery: number;
}

interface Props {
  concepts: ConceptBar[];
  maxItems?: number;
  className?: string;
}

export function ConceptMasteryBars({ concepts, maxItems = 8, className }: Props) {
  const sorted = [...concepts].sort((a, b) => a.mastery - b.mastery).slice(0, maxItems);
  if (sorted.length === 0) return null;

  return (
    <div className={cn('space-y-2.5 concept-mastery-bars', className)} data-clarity-pass="k166">
      {sorted.map((c) => {
        const band = masteryBand(c.mastery);
        return (
          <div key={c.concept} className="proximity-track" data-mastery-band={band}>
            {/* OPT-K9b — label + % sit together; bar uses same tight track */}
            <div className="proximity-row flex flex-wrap items-baseline gap-x-3 gap-y-0.5 type-caption mb-1">
              <span className="proximity-row-label text-text-secondary truncate">{c.concept}</span>
              {/* OPT-K90 — ink owns labels; bar fill carries quiet band hue */}
              <span className="shrink-0 tabular-nums text-text-tertiary">
                {c.mastery}% · {band}
              </span>
            </div>
            {/* Wave P-2 C08 — Concept mastery bar track uses --viz-bar-track
                (theme-tuned to ≥3:1 vs card surface) so weak-band fills (3–20%)
                always reveal a visible track behind them, particularly on the
                spectrum + warm-light themes where bg-surface-hover collapsed.
                OPT-K88 — data-mastery-band lets dark themes soft-mix fills in CSS. */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
              <div
                className="h-full rounded-full transition-all duration-500 mastery-bar-fill"
                style={{ width: `${c.mastery}%`, backgroundColor: bandColor(band) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
