import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { t, type Lang } from '../../lib/i18n';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import { UxShimmerPanel, UxShimmerSkeleton } from '../ui/UxShimmerSkeleton';

type Props = {
  tool: WorkspaceToolId | 'discover' | 'concept-bus' | 'weak-areas';
  lang: Lang;
  className?: string;
};

/** Per-panel loading skeleton — cyan shimmer on blueprint (Wave E12). */
export function WorkspaceToolSkeleton({ tool, lang, className }: Props) {
  const label = tool === 'discover' || tool === 'concept-bus' || tool === 'weak-areas'
    ? tool
    : workspaceToolLabel(tool, lang);
  const status = t('loadingTool', lang).replace('{label}', label);

  return (
    <div
      className={cn('flex h-full min-h-[12rem] flex-col gap-4 p-4 sm:p-6', className)}
      data-testid={`workspace-tool-skeleton-${tool}`}
      role="status"
      aria-live="polite"
      aria-label={status}
    >
      <div className="flex items-center gap-3">
        <UxShimmerSkeleton className="h-9 w-9 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <UxShimmerSkeleton className="h-4 w-32 rounded" />
          <UxShimmerSkeleton className="h-3 w-48 max-w-full rounded" />
        </div>
      </div>
      <div className="ux-shimmer-panel flex-1 rounded-2xl border border-border-subtle bg-surface-card/40 p-4">
        <UxShimmerPanel lines={3} />
        <UxShimmerSkeleton className="mt-4 h-24 rounded-xl" />
        <div className="flex gap-2 pt-2">
          <UxShimmerSkeleton className="h-8 w-24 rounded-lg" />
          <UxShimmerSkeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <span className="sr-only">{status}</span>
    </div>
  );
}
