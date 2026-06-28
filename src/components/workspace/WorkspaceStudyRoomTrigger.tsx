import { Users } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';

type Props = {
  lang: 'en' | 'el';
  open?: boolean;
  onClick: () => void;
  variant?: 'chip' | 'chrome';
  compact?: boolean;
  className?: string;
};

/** Discoverable study-room entry — sand + brand only; label always visible. */
export function WorkspaceStudyRoomTrigger({
  lang,
  open = false,
  onClick,
  variant = 'chip',
  compact = false,
  className,
}: Props) {
  const isEl = lang === 'el';
  const label = isEl ? 'Ομαδική' : 'Together';

  if (variant === 'chrome') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={open}
        aria-label={isEl ? 'Ομαδική μελέτη' : 'Study together'}
        data-testid="workspace-study-room-open"
        className={cn('ws-chrome-btn', open && 'ws-chrome-btn-active', className)}
      >
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={open}
      aria-label={isEl ? 'Ομαδική μελέτη' : 'Study together'}
      data-testid="workspace-study-room-open"
      className={cn(
        'ws-eyebrow shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
        open ? 'ws-chip-brand' : 'ws-chip-neutral',
        className,
      )}
    >
      <Users className="h-3 w-3" aria-hidden />
      {!compact && label}
    </button>
  );
}
