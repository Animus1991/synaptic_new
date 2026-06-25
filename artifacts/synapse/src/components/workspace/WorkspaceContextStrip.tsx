import { AlertTriangle } from 'lucide-react';
import type { WorkspaceContextBreadcrumb } from '../../lib/workspaceContextModel';

type Props = {
  context: WorkspaceContextBreadcrumb;
  lang: 'en' | 'el';
  sourceQuality?: number | null;
  onNextAction?: () => void;
  onWeakAreas?: () => void;
  onConceptBus?: () => void;
  weakCount?: number;
  conceptCount?: number;
  showNextAction?: boolean;
  nextActionLabel?: string;
  weakPanelOpen?: boolean;
  conceptBusOpen?: boolean;
};

export function WorkspaceContextStrip({
  context,
  lang,
  sourceQuality,
  onNextAction,
  onWeakAreas,
  onConceptBus,
  weakCount = 0,
  conceptCount = 0,
  showNextAction = false,
  nextActionLabel: nextActionLabelProp,
  weakPanelOpen = false,
  conceptBusOpen = false,
}: Props) {
  const isEl = lang === 'el';

  return (
    <div
      className="relative z-10 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border-subtle/70 bg-surface-primary/70 shrink-0"
      data-testid="workspace-context-strip"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-text-muted">
          {context.courseLabel && (
            <>
              <span className="truncate max-w-[120px] font-medium text-text-secondary" title={context.courseLabel}>
                {context.courseLabel}
              </span>
              <span aria-hidden>/</span>
            </>
          )}
          <span
            className="truncate max-w-[160px] font-medium text-text-primary"
            title={context.sectionLabel}
            data-testid="workspace-context-section"
          >
            {context.lowConfidenceSection && (
              <AlertTriangle className="mr-0.5 inline h-3 w-3 text-accent-amber align-[-2px]" aria-hidden />
            )}
            {context.sectionLabel}
          </span>
          <span aria-hidden>·</span>
          <span className="shrink-0" data-testid="workspace-context-step">{context.stepLabel}</span>
          {context.stepType && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate max-w-[100px]">{context.stepType}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span className="truncate font-medium text-brand-300" data-testid="workspace-context-tool">
            {context.toolLabel}
          </span>
        </div>
        <p className="mt-0.5 hidden text-[9px] text-text-muted sm:block truncate" title={context.toolDescription}>
          {context.toolDescription}
          {typeof sourceQuality === 'number' && (
            <span className="ml-2 text-accent-amber">
              · {isEl ? 'Ποιότητα' : 'Quality'} {sourceQuality}/100
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {showNextAction && onNextAction && (
          <button
            type="button"
            onClick={onNextAction}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-500/10 px-2 py-1 text-[10px] font-semibold text-brand-300 hover:bg-brand-500/15"
            data-testid="workspace-next-action"
          >
            {nextActionLabelProp ?? (isEl ? 'Επόμενο' : 'Next')}
          </button>
        )}
        {weakCount > 0 && onWeakAreas && (
          <button
            type="button"
            onClick={onWeakAreas}
            className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${
              weakPanelOpen
                ? 'border-accent-rose/40 bg-accent-rose/10 text-accent-rose'
                : 'border-border-subtle text-text-secondary hover:bg-surface-hover'
            }`}
            data-testid="workspace-weak-areas-toggle"
          >
            {isEl ? 'Αδύναμα' : 'Weak'} ({weakCount})
          </button>
        )}
        {onConceptBus && (
          <button
            type="button"
            onClick={onConceptBus}
            className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${
              conceptBusOpen
                ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                : 'border-border-subtle text-text-secondary hover:bg-surface-hover'
            }`}
            data-testid="workspace-concept-bus-toggle"
          >
            {isEl ? 'Έννοιες' : 'Concepts'} {conceptCount > 0 ? `(${conceptCount})` : ''}
          </button>
        )}
      </div>
    </div>
  );
}
