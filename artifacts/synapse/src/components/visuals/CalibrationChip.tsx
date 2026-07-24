import { cn } from '../../utils/cn';
import { BlueprintSurface } from '../ui/BlueprintSurface';
import type { CalibrationDirection } from '../../lib/pedagogy';

interface Props {
  score: number;
  direction: CalibrationDirection;
}

const labels: Record<CalibrationDirection, { text: string; chip: string; hint: string }> = {
  overconfident: {
    text: 'Overconfident',
    chip: 'ws-chip-danger',
    hint: 'You predicted higher confidence than your actual accuracy. Rate lower before submitting.',
  },
  underconfident: {
    text: 'Underconfident',
    chip: 'ws-chip-brand',
    hint: 'You underestimate yourself. Trust your knowledge more on retrieval tasks.',
  },
  calibrated: {
    text: 'Well calibrated',
    chip: 'ws-chip-ok',
    hint: 'Your confidence ratings match your actual performance.',
  },
};

export function CalibrationChip({ score, direction }: Props) {
  const meta = labels[direction];
  return (
    <BlueprintSurface className="p-4">
      {/* OPT-K9b — score sits beside status chip, not far-right of ultrawide well */}
      <div className="proximity-row flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={cn('proximity-row-label text-xs px-2.5 py-1 rounded-full', meta.chip)}>
          {meta.text}
        </span>
        <span className="text-lg font-bold text-text-primary ws-num tabular-nums shrink-0">{score}/100</span>
      </div>
      <p className="proximity-track text-xs text-text-secondary mt-2 leading-relaxed">{meta.hint}</p>
    </BlueprintSurface>
  );
}
