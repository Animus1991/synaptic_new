import { Users } from '@/lib/lucide-shim';
import { t, type Lang } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type Props = {
  lang: Lang;
  visible: boolean;
  status: string;
  mode: 'leading' | 'following' | 'solo';
  onOpenRoom: () => void;
  onClaimLead?: () => void;
  onFollowLead?: () => void;
};

/** Persistent strip while a Study Room session wraps the Study Hub viewport. */
export function StudyRoomCoViewBanner({
  lang,
  visible,
  status,
  mode,
  onOpenRoom,
  onClaimLead,
  onFollowLead,
}: Props) {
  const tr = (key: Parameters<typeof t>[0]) => t(key, lang);
  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b text-xs',
        mode === 'leading'
          ? 'border-brand-500/30 bg-brand-500/10 text-text-primary'
          : 'border-border-subtle bg-surface-secondary/90 text-text-secondary',
      )}
      data-testid="study-room-coview-banner"
      role="status"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{tr('studyRoomCoViewTitle')}</p>
          <p className="type-caption text-text-muted truncate">{status}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {mode === 'following' && onClaimLead && (
          <button
            type="button"
            className="ws-chrome-btn type-caption px-2 py-1 min-h-9"
            data-testid="study-room-claim-lead"
            onClick={onClaimLead}
          >
            {tr('studyRoomClaimLead')}
          </button>
        )}
        {mode === 'leading' && onFollowLead && (
          <button
            type="button"
            className="ws-chrome-btn type-caption px-2 py-1 min-h-9"
            data-testid="study-room-follow-lead"
            onClick={onFollowLead}
          >
            {tr('studyRoomFollowLead')}
          </button>
        )}
        <button
          type="button"
          className="ws-empty-cta-secondary type-caption px-2 py-1 min-h-9"
          data-testid="study-room-banner-open"
          onClick={onOpenRoom}
        >
          {tr('studyRoomOpenPanel')}
        </button>
      </div>
    </div>
  );
}
