import { Users } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';

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
  lang: _lang,
  open = false,
  onClick,
  variant = 'chip',
  compact = false,
  className,
}: Props) {
  const { t } = useI18n();
  const label = t('studyTogetherShort');

  if (variant === 'chrome') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={open}
        aria-label={t('studyRoomTitle')}
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
      aria-label={t('studyRoomTitle')}
      data-testid="workspace-study-room-open"
      className={cn(
        'ws-eyebrow shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
        open ? 'ws-chip-brand' : 'ws-chip-neutral',
        className,
      )}
    >
      <Users className="h-3 w-3" aria-hidden />
      {!compact && <AllCapsLabel>{label}</AllCapsLabel>}
    </button>
  );
}
