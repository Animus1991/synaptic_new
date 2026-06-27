import { AlertTriangle } from '@/lib/lucide-shim';
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
      className="relative z-10 flex flex-col gap-1.5 px-3 py-1.5 border-b border-border-subtle/70 bg-surface-primary/70 shrink-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
      data-testid="workspace-context-strip"
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden text-[11px] text-text-muted whitespace-nowrap">
          {context.courseLabel && (
            <>
              <span className="truncate shrink min-w-0 font-medium text-text-secondary" title={context.courseLabel}>
                {context.courseLabel}
              </span>
              <span aria-hidden className="shrink-0">/</span>
            </>
          )}
          <span
            className="truncate shrink min-w-0 font-medium text-text-primary"
            title={context.sectionLabel}
            data-testid="workspace-context-section"
          >
            {context.lowConfidenceSection && (
              <AlertTriangle className="mr-0.5 inline h-3 w-3 text-accent-amber align-[-2px]" aria-hidden />
            )}
            {context.sectionLabel}
          </span>
          <span aria-hidden className="shrink-0">·</span>
          <span className="shrink-0" data-testid="workspace-context-step">{context.stepLabel}</span>
          {context.stepType && (
            <>
              <span aria-hidden className="shrink-0">·</span>
              <span className="truncate shrink min-w-0 hidden sm:inline">{context.stepType}</span>
            </>
          )}
          <span aria-hidden className="shrink-0 hidden xs:inline">·</span>
          <span className="truncate shrink-0 font-medium text-brand-300 hidden xs:inline" data-testid="workspace-context-tool">
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
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-none">
        {showNextAction && onNextAction && (
          <button
            type="button"
            onClick={onNextAction}
            className="ws-eyebrow inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-500/35 bg-brand-500/10 px-2 py-1 text-[10px] text-brand-200 hover:bg-brand-500/15"
            data-testid="workspace-next-action"
          >
            {nextActionLabelProp ?? (isEl ? 'Επόμενο' : 'Next')}
          </button>
        )}
        {weakCount > 0 && onWeakAreas && (
          <button
            type="button"
            onClick={onWeakAreas}
            aria-pressed={weakPanelOpen}
            className={`ws-eyebrow shrink-0 rounded-md border px-2 py-1 text-[10px] ${
              weakPanelOpen
                ? 'border-accent-rose/40 bg-accent-rose/10 text-accent-rose'
                : 'border-border-subtle text-text-secondary hover:bg-surface-hover'
            }`}
            data-testid="workspace-weak-areas-toggle"
          >
            {isEl ? 'Αδύναμα' : 'Weak'} <span className="ws-num">({weakCount})</span>
          </button>
        )}
        {onConceptBus && (
          <button
            type="button"
            onClick={onConceptBus}
            aria-pressed={conceptBusOpen}
            className={`ws-eyebrow shrink-0 rounded-md border px-2 py-1 text-[10px] ${
              conceptBusOpen
                ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                : 'border-border-subtle text-text-secondary hover:bg-surface-hover'
            }`}
            data-testid="workspace-concept-bus-toggle"
          >
            {isEl ? 'Έννοιες' : 'Concepts'} {conceptCount > 0 ? <span className="ws-num">({conceptCount})</span> : ''}
          </button>
        )}
      </div>
    </div>
  );
}
