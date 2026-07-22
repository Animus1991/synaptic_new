import { useState } from 'react';
import { Grid3X3 } from '@/lib/lucide-shim';
import type { ConceptMasteryHeatmapModel } from '../../lib/knowledgeFlowAnalytics';
import { masteryColorForValue, readinessBandMeta } from '../../lib/masteryPalette';
import { cn } from '../../utils/cn';

type HoverCell = {
  concept: string;
  daysAgo: number;
  mastery: number;
};

type Props = {
  model: ConceptMasteryHeatmapModel;
  title: string;
  hint: string;
  emptyLabel: string;
  dayTooltip: (concept: string, daysAgo: number, mastery: number) => string;
  formatDayLabel: (daysAgo: number) => string;
  bandLabels: {
    weak: string;
    developing: string;
    proficient: string;
    strong: string;
  };
};

export function ConceptMasteryHeatmapChart({
  model,
  title,
  hint,
  emptyLabel,
  dayTooltip,
  formatDayLabel,
  bandLabels,
}: Props) {
  const [hover, setHover] = useState<HoverCell | null>(null);
  const { concepts, dayLabels, values, hasData } = model;

  if (!hasData || concepts.length === 0) {
    return (
      <div
        className="ux-card blueprint-surface flex flex-col items-center justify-center min-h-[220px] text-center"
        data-testid="concept-mastery-heatmap-empty"
      >
        <Grid3X3 className="w-8 h-8 text-text-tertiary mb-2" />
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      </div>
    );
  }

  const legend = [
    { label: bandLabels.weak, band: readinessBandMeta(25) },
    { label: bandLabels.developing, band: readinessBandMeta(45) },
    { label: bandLabels.proficient, band: readinessBandMeta(65) },
    { label: bandLabels.strong, band: readinessBandMeta(85) },
  ];

  return (
    <div className="ux-card blueprint-surface" data-testid="concept-mastery-heatmap">
      <h3 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Grid3X3 className="w-4 h-4 text-brand-400" />
        {title}
      </h3>
      <p className="text-xs text-text-tertiary mb-4">{hint}</p>

      {hover && (
        <div className="mb-3 inline-flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-card/60 px-4 py-2 text-sm">
          <span
            className="h-3 w-3 rounded shrink-0"
            style={{ backgroundColor: masteryColorForValue(hover.mastery) }}
          />
          <span className="font-semibold text-text-primary">{hover.concept}</span>
          <span className="text-text-tertiary">{formatDayLabel(hover.daysAgo)}</span>
          <span className="font-semibold text-brand-800">{hover.mastery}%</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-primary/40 p-4">
        <div className="min-w-[640px]">
          <div className="mb-2 flex">
            <div className="w-28 shrink-0" />
            {dayLabels.map((daysAgo) => (
              <div key={daysAgo} className="flex-1 text-center text-[10px] text-text-muted">
                {daysAgo === 0 ? '·' : daysAgo % 7 === 0 ? daysAgo : ''}
              </div>
            ))}
          </div>
          {concepts.map((concept, rowIdx) => (
            <div key={concept} className="mb-1 flex items-center">
              <div className="w-28 shrink-0 truncate pr-2 text-xs text-text-secondary" title={concept}>
                {concept}
              </div>
              {dayLabels.map((daysAgo, colIdx) => {
                const mastery = values[rowIdx]?.[colIdx] ?? 0;
                const color = masteryColorForValue(mastery);
                return (
                  <div key={daysAgo} className="flex flex-1 justify-center px-px">
                    <div
                      className={cn(
                        'heatmap-cell h-5 w-full max-w-[28px] rounded-[5px] transition-all duration-150',
                        'hover:scale-125 hover:ring-2 hover:ring-brand-500/30',
                      )}
                      style={{
                        backgroundColor: color,
                        opacity: 0.35 + (mastery / 100) * 0.65,
                      }}
                      title={dayTooltip(concept, daysAgo, mastery)}
                      onMouseEnter={() => setHover({ concept, daysAgo, mastery })}
                      onMouseLeave={() => setHover(null)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-text-muted">
            {legend.map(({ label, band }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: band.color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
