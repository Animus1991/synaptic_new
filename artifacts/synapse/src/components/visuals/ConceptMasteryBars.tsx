import { masteryBand, bandColor } from '../../lib/pedagogy';

interface ConceptBar {
  concept: string;
  mastery: number;
}

interface Props {
  concepts: ConceptBar[];
  maxItems?: number;
}

export function ConceptMasteryBars({ concepts, maxItems = 8 }: Props) {
  const sorted = [...concepts].sort((a, b) => a.mastery - b.mastery).slice(0, maxItems);
  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {sorted.map((c) => {
        const band = masteryBand(c.mastery);
        return (
          <div key={c.concept}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary truncate pr-2">{c.concept}</span>
              <span className="font-medium shrink-0" style={{ color: bandColor(band) }}>
                {c.mastery}% · {band}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${c.mastery}%`, backgroundColor: bandColor(band) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
