import type { LucideIcon } from '@/lib/lucide-shim';
import { Upload } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { PrimaryCTA, SecondaryCTA } from './primitives';
import { BlueprintSurface } from './BlueprintSurface';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  'data-testid'?: string;
};

/** Bento empty state for platform pages (Library, Agent, Tasks, Course). OPT-K98/K99 — ink chrome + type-led calm. */
export function PlatformEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Upload,
  className,
  secondaryActionLabel,
  onSecondaryAction,
  'data-testid': testId = 'platform-empty-state',
}: Props) {
  return (
    <BlueprintSurface
      className={cn(
        'platform-empty-state flex flex-col items-center justify-center py-16 px-6 text-center border border-border-subtle bg-surface-card/60',
        className,
      )}
      data-testid={testId}
    >
      <div className="platform-empty-state-icon grid h-14 w-14 place-items-center rounded-2xl border border-border-subtle bg-surface-secondary mb-5">
        <Icon className="h-7 w-7 text-text-tertiary" aria-hidden />
      </div>
      <h3 className="ws-serif text-xl font-medium tracking-tight text-text-primary mb-2 max-w-lg leading-snug">{title}</h3>
      <p className="text-sm text-text-secondary mb-7 max-w-md leading-relaxed">{description}</p>
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
    </BlueprintSurface>
  );
}
