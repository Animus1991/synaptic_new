import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { t, type Lang } from '../../lib/i18n';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';

type Props = {
  tool: WorkspaceToolId | 'discover' | 'concept-bus' | 'weak-areas';
  lang: Lang;
  className?: string;
};

/** Per-panel loading skeleton — replaces generic spinner text during lazy tool mount. */
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
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-brand-600/15" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-brand-600/20" />
          <div className="h-3 w-48 max-w-full animate-pulse rounded bg-surface-elevated" />
        </div>
      </div>
      <div className="flex-1 space-y-3 rounded-2xl border border-border-subtle bg-surface-card/40 p-4">
        <div className="h-3 w-full animate-pulse rounded bg-surface-elevated" />
        <div className="h-3 w-[92%] animate-pulse rounded bg-surface-elevated" />
        <div className="h-3 w-[78%] animate-pulse rounded bg-surface-elevated" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-brand-600/8" />
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-elevated" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-elevated" />
        </div>
      </div>
      <span className="sr-only">{status}</span>
    </div>
  );
}
