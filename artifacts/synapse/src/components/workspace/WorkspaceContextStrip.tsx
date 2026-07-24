import { AlertTriangle } from '@/lib/lucide-shim';
import type { WorkspaceContextBreadcrumb } from '../../lib/workspaceContextModel';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';

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
  lang: _lang,
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
  const { t } = useI18n();

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
              <AlertTriangle className="mr-0.5 inline h-3 w-3 align-[-2px] opacity-90" aria-hidden />
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
          <span className="truncate shrink-0 font-medium text-brand-800 hidden xs:inline" data-testid="workspace-context-tool">
            {context.toolLabel}
          </span>
        </div>
        <p className="mt-0.5 hidden text-[10px] text-text-muted sm:block truncate" title={context.toolDescription}>
          {context.toolDescription}
          {typeof sourceQuality === 'number' && (
            <span className="ml-2 ws-chip-warn inline-flex rounded-full px-1.5 py-px text-[10px]">
              · {t('contextQualityLabel')} {sourceQuality}/100
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-none">
        {showNextAction && onNextAction && (
          <button
            type="button"
            onClick={onNextAction}
            className="ws-eyebrow ws-chip-brand inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] hover:opacity-90"
            data-testid="workspace-next-action"
          >
            <AllCapsLabel>{nextActionLabelProp ?? t('next')}</AllCapsLabel>
          </button>
        )}
        {weakCount > 0 && onWeakAreas && (
          <button
            type="button"
            onClick={onWeakAreas}
            aria-pressed={weakPanelOpen}
            className={`ws-eyebrow shrink-0 rounded-md px-2 py-1 text-[10px] ${
              weakPanelOpen ? 'ws-chip-danger' : 'ws-chip-neutral hover:opacity-90'
            }`}
            data-testid="workspace-weak-areas-toggle"
          >
            <AllCapsLabel>{t('weak')}</AllCapsLabel> <span className="ws-num">({weakCount})</span>
          </button>
        )}
        {onConceptBus && (
          <button
            type="button"
            onClick={onConceptBus}
            aria-pressed={conceptBusOpen}
            className={`ws-eyebrow shrink-0 rounded-md px-2 py-1 text-[10px] ${
              conceptBusOpen ? 'ws-chip-brand' : 'ws-chip-neutral hover:opacity-90'
            }`}
            data-testid="workspace-concept-bus-toggle"
          >
            <AllCapsLabel>{t('contextConceptsLabel')}</AllCapsLabel> {conceptCount > 0 ? <span className="ws-num">({conceptCount})</span> : ''}
          </button>
        )}
      </div>
    </div>
  );
}
