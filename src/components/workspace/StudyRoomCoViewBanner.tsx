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

/** Persistent strip while a Study Room session wraps the Study Hub viewport. OPT-K161 — text-first wash. */
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
        'flex flex-wrap items-center justify-between gap-2 border-b border-transparent px-3 py-2 type-caption',
        mode === 'leading'
          ? 'bg-brand-500/8 text-text-primary'
          : 'bg-surface-secondary/70 text-text-secondary',
      )}
      data-testid="study-room-coview-banner"
      data-clarity-pass="k161"
      role="status"
    >
      <div className="min-w-0">
        <p className="font-medium truncate">{tr('studyRoomCoViewTitle')}</p>
        <p className="type-caption text-text-muted truncate">{status}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {mode === 'following' && onClaimLead && (
          <button
            type="button"
            className="ws-chrome-btn type-caption min-h-8 px-2 py-1"
            data-testid="study-room-claim-lead"
            onClick={onClaimLead}
          >
            {tr('studyRoomClaimLead')}
          </button>
        )}
        {mode === 'leading' && onFollowLead && (
          <button
            type="button"
            className="ws-chrome-btn type-caption min-h-8 px-2 py-1"
            data-testid="study-room-follow-lead"
            onClick={onFollowLead}
          >
            {tr('studyRoomFollowLead')}
          </button>
        )}
        <button
          type="button"
          className="ws-empty-cta-secondary type-caption min-h-8 px-2 py-1"
          data-testid="study-room-banner-open"
          onClick={onOpenRoom}
        >
          {tr('studyRoomOpenPanel')}
        </button>
      </div>
    </div>
  );
}
