import { t, type Lang } from '../../lib/i18n';
import { useStudyRoomSharedNotes } from '../../hooks/useStudyRoomSharedNotes';

type Props = {
  lang: Lang;
  roomId: string;
  inviteCode: string;
  wsUrl: string | null;
  localOnly?: boolean;
};

export function StudyRoomSharedNotes({ lang, roomId, inviteCode, wsUrl, localOnly }: Props) {
  const tr = (key: Parameters<typeof t>[0]) => t(key, lang);
  const enabled = !localOnly && Boolean(wsUrl);
  const { text, updateText, synced } = useStudyRoomSharedNotes({
    roomId,
    inviteCode,
    wsUrl,
    enabled,
  });

  if (localOnly) {
    return (
      <p className="text-[11px] text-text-muted">{tr('studyRoomCollabOffline')}</p>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="study-room-shared-notes">
      <div className="flex items-center justify-between gap-2">
        <p className="ws-field-label">{tr('studyRoomSharedNotes')}</p>
        <span className="text-[10px] text-text-muted">
          {synced ? tr('studyRoomCollabSynced') : tr('studyRoomCollabConnecting')}
        </span>
      </div>
      <p className="text-[10px] text-text-muted">{tr('studyRoomSharedNotesHint')}</p>
      <textarea
        value={text}
        onChange={(e) => updateText(e.target.value)}
        rows={4}
        className="ws-field-input text-xs resize-y min-h-[5rem]"
        placeholder={tr('studyRoomSharedNotesPlaceholder')}
        data-testid="study-room-shared-notes-input"
      />
    </div>
  );
}
