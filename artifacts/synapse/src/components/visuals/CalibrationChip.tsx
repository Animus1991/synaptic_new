import { cn } from '../../utils/cn';
import type { CalibrationDirection } from '../../lib/pedagogy';

interface Props {
  score: number;
  direction: CalibrationDirection;
}

const labels: Record<CalibrationDirection, { text: string; color: string; hint: string }> = {
  overconfident: {
    text: 'Overconfident',
    color: 'text-accent-rose bg-accent-rose/10 border-accent-rose/30',
    hint: 'You predicted higher confidence than your actual accuracy. Rate lower before submitting.',
  },
  underconfident: {
    text: 'Underconfident',
    color: 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30',
    hint: 'You underestimate yourself. Trust your knowledge more on retrieval tasks.',
  },
  calibrated: {
    text: 'Well calibrated',
    color: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/30',
    hint: 'Your confidence ratings match your actual performance.',
  },
};

export function CalibrationChip({ score, direction }: Props) {
  const meta = labels[direction];
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', meta.color)}>
          {meta.text}
        </span>
        <span className="text-lg font-bold text-text-primary">{score}/100</span>
      </div>
      <p className="text-xs text-text-tertiary mt-2 leading-relaxed">{meta.hint}</p>
    </div>
  );
}
