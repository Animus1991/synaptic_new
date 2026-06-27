import { cn } from '../../utils/cn';
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
    <div className="ws-bento p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={cn('text-xs px-2.5 py-1 rounded-full', meta.chip)}>
          {meta.text}
        </span>
        <span className="text-lg font-bold text-text-primary ws-num">{score}/100</span>
      </div>
      <p className="text-xs text-text-secondary mt-2 leading-relaxed">{meta.hint}</p>
    </div>
  );
}
