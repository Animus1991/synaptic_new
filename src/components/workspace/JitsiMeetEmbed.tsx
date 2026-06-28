import { jitsiMeetUrl } from '../../lib/studyRoomClient';

type Props = {
  roomName: string;
  lang?: 'en' | 'el';
  className?: string;
};

/** Free in-app video via Jitsi — no Google account required. */
export function JitsiMeetEmbed({ roomName, lang = 'en', className }: Props) {
  const isEl = lang === 'el';
  const src = `${jitsiMeetUrl(roomName)}&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  return (
    <div className={className} data-testid="jitsi-meet-embed">
      <iframe
        title={isEl ? 'Ομαδική βιντεοκλήση' : 'Group video call'}
        src={src}
        allow="camera; microphone; fullscreen; display-capture"
        className="h-48 w-full rounded-lg border border-border-subtle bg-surface-primary sm:h-56"
      />
    </div>
  );
}
