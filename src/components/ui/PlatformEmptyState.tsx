import type { LucideIcon } from '@/lib/lucide-shim';
import { Upload } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

/** Bento empty state for platform pages (Library, Agent, Tasks). */
export function PlatformEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Upload,
  className,
  secondaryActionLabel,
  onSecondaryAction,
}: Props) {
  return (
    <div className={cn('ws-bento flex flex-col items-center justify-center py-16 px-6 text-center', className)} data-testid="platform-empty-state">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-brand-500/20 bg-brand-500/10 mb-5">
        <Icon className="h-8 w-8 text-brand-600" aria-hidden />
      </div>
      <h3 className="ws-serif text-lg font-medium text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary mb-6 max-w-md">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex items-center gap-2 px-5 py-3 border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:border-brand-500/35 hover:text-brand-700 transition-colors"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
