import type { LucideIcon } from '@/lib/lucide-shim';
import { Upload } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { PrimaryCTA, SecondaryCTA } from './primitives';

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
          <PrimaryCTA onClick={onAction}>
            <Upload className="w-4 h-4" />
            {actionLabel}
          </PrimaryCTA>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <SecondaryCTA onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </SecondaryCTA>
        )}
      </div>
    </div>
  );
}
