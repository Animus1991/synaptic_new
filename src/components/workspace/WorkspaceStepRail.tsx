import { Check } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { displayWorkspaceStepTitle } from '../../lib/workspaceContextModel';
import { stepHeatDotClass, type ReaderHeatmapStepSyncReport } from '../../lib/readerHeatmapStepSyncQA';
import type { ReaderHeatmapLevel } from '../../lib/readerLearningHeatmap';

export type StepRailItem = { title: string; type?: string };

const MAX_VISIBLE = 14;

type Props = {
  steps: StepRailItem[];
  currentStep: number;
  quizConcept: string;
  lang: 'en' | 'el';
  readerStepHeatLevels?: Record<number, ReaderHeatmapLevel | undefined>;
  readerHeatSyncReport?: ReaderHeatmapStepSyncReport;
  onSelectStep: (index: number, opts?: { focusReader?: boolean }) => void;
};

/** Virtualised step rail — renders a sliding window around the active step (B6). */
export function WorkspaceStepRail({
  steps,
  currentStep,
  quizConcept,
  lang,
  readerStepHeatLevels = {},
  readerHeatSyncReport,
  onSelectStep,
}: Props) {
  const total = steps.length;
  if (total === 0) return null;

  const windowSize = Math.min(MAX_VISIBLE, total);
  let start = Math.max(0, currentStep - Math.floor(windowSize / 2));
  if (start + windowSize > total) start = Math.max(0, total - windowSize);
  const indices = Array.from({ length: windowSize }, (_, i) => start + i);
  const hasLeading = start > 0;
  const hasTrailing = start + windowSize < total;

  const renderStep = (i: number) => {
    const s = steps[i];
    if (!s) return null;
    const label = displayWorkspaceStepTitle(s.title, quizConcept, lang);
    const shortLabel = label.length > 16 ? `${label.slice(0, 14)}…` : label;
    const heat = readerStepHeatLevels[i];
    return (
      <button
        key={i}
        type="button"
        onClick={() => onSelectStep(i, { focusReader: true })}
        data-testid={`workspace-step-rail-${i}`}
        aria-current={currentStep === i ? 'step' : undefined}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0 transition-all',
          currentStep === i
            ? 'bg-accent-cyan/15 text-brand-800'
            : i < currentStep
              ? 'text-accent-emerald hover:bg-surface-hover'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover',
        )}
      >
        <span
          className={cn(
            'w-4 h-4 rounded-full border text-[8px] flex items-center justify-center relative',
            currentStep === i
              ? 'border-accent-cyan text-brand-800 bg-accent-cyan/10'
              : i < currentStep
                ? 'border-accent-emerald text-accent-emerald bg-accent-emerald/10'
                : 'border-text-muted/30',
          )}
        >
          {i < currentStep ? <Check className="w-2.5 h-2.5" aria-hidden /> : i + 1}
          {heat && (
            <span
              className={cn('absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-surface-card', stepHeatDotClass(heat))}
              data-testid={`workspace-step-heat-${i}`}
              title={readerHeatSyncReport?.steps[i]?.heatReasons.join(' · ')}
            />
          )}
        </span>
        <span className="hidden sm:inline">{shortLabel}</span>
      </button>
    );
  };

  return (
    <>
      {hasLeading && (
        <button
          type="button"
          onClick={() => onSelectStep(0, { focusReader: true })}
          className="px-2 py-1 rounded-full text-[10px] text-text-muted hover:text-text-secondary shrink-0"
          aria-label="First step"
        >
          1…
        </button>
      )}
      {indices.map(renderStep)}
      {hasTrailing && (
        <button
          type="button"
          onClick={() => onSelectStep(total - 1, { focusReader: true })}
          className="px-2 py-1 rounded-full text-[10px] text-text-muted hover:text-text-secondary shrink-0"
          aria-label="Last step"
        >
          …{total}
        </button>
      )}
    </>
  );
}
