import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, Copy, Video, LogOut, Plus, X } from '@/lib/lucide-shim';
import type { UserSettings } from '../../types';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import { useStudyRoomSession } from '../../hooks/useStudyRoomSession';
import { JitsiMeetEmbed } from './JitsiMeetEmbed';

type Props = {
  open: boolean;
  onClose: () => void;
  lang: 'en' | 'el';
  courseId?: string;
  courseName?: string;
  activeTool: WorkspaceToolId;
  focusConcept?: string;
  userSettings?: UserSettings;
  onFollowSharedTool?: (tool: string) => void;
};

export function StudyRoomPanel(props: Props) {
  const { open, onClose, lang, activeTool, onFollowSharedTool } = props;
  const isEl = lang === 'el';
  const [showVideo, setShowVideo] = useState(true);

  const {
    room,
    memberId,
    displayName,
    setDisplayName,
    inviteInput,
    setInviteInput,
    busy,
    error,
    apiStatus,
    handleCreate,
    handleJoin,
    handleLeave,
  } = useStudyRoomSession({ ...props, onFollowSharedTool });

  const copyInvite = async () => {
    if (!room?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(room.inviteCode);
    } catch {
      /* optional */
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button
        type="button"
        className="ws-cognitive-backdrop"
        data-ws-theme="warm"
        aria-label={isEl ? 'Κλείσιμο' : 'Close'}
        onClick={onClose}
      />
      <div
        className="ws-cognitive-sheet"
        data-ws-theme="warm"
        role="dialog"
        aria-modal
        aria-label={isEl ? 'Ομαδικό δωμάτιο μελέτης' : 'Study room'}
        data-testid="study-room-panel"
      >
        <header className="ws-cognitive-sheet-header">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 shrink-0 text-brand-800" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">{isEl ? 'Ομαδική μελέτη' : 'Study together'}</h2>
              {apiStatus?.localFallback && (
                <p className="text-[10px] text-text-muted truncate">
                  {isEl ? 'Τοπική λειτουργία (χωρίς server)' : 'Local mode (no server)'}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="ws-chrome-btn p-1.5" aria-label={isEl ? 'Κλείσιμο' : 'Close'}>
            <X className="h-4 w-4" />
          </button>
        </header>

        {error && (
          <div className="mx-4 mt-3 ws-chip-danger rounded-lg border px-3 py-2 text-xs" role="alert">
            {error}
          </div>
        )}

        <div className="ws-cognitive-sheet-body">
          {!room ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreate();
              }}
            >
              <p className="text-xs leading-relaxed text-text-secondary">
                {isEl
                  ? 'Δημιούργησε δωμάτιο ή μπες με κωδικό. Βιντεοκλήση Jitsi — χωρίς Google.'
                  : 'Create a room or join with a code. Jitsi video — no Google account.'}
              </p>
              <label className="block">
                <span className="ws-field-label">{isEl ? 'Όνομα εμφάνισης' : 'Display name'}</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="ws-field-input mt-1"
                  placeholder={isEl ? 'π.χ. Μαρία' : 'e.g. Alex'}
                  autoComplete="nickname"
                  required
                />
              </label>
              <button type="submit" disabled={busy} className="ws-empty-cta-primary w-full justify-center gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                {busy ? (isEl ? 'Δημιουργία…' : 'Creating…') : (isEl ? 'Νέο δωμάτιο' : 'New room')}
              </button>
              <div className="relative py-1 text-center text-[10px] text-text-muted">
                <span className="relative z-10 bg-surface-secondary px-2">{isEl ? 'ή' : 'or'}</span>
                <div className="absolute inset-x-0 top-1/2 border-t border-border-subtle" />
              </div>
              <label className="block">
                <span className="ws-field-label">{isEl ? 'Κωδικός πρόσκλησης' : 'Invite code'}</span>
                <input
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  className="ws-field-input mt-1 font-mono"
                  placeholder="a1b2c3d4"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleJoin()}
                className="ws-empty-cta-secondary w-full justify-center"
              >
                {busy ? (isEl ? 'Σύνδεση…' : 'Joining…') : (isEl ? 'Συμμετοχή' : 'Join room')}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="ws-info-strip text-xs">
                <span className="font-semibold">{room.name}</span>
                <span className="text-text-muted">
                  {' '}
                  · {room.members.length} {isEl ? 'μέλη' : 'online'}
                  {room.localOnly ? (isEl ? ' · τοπικό' : ' · local') : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="ws-field-input flex-1 py-1.5 text-xs font-mono">{room.inviteCode}</code>
                <button type="button" onClick={() => void copyInvite()} className="ws-chrome-btn p-2" title={isEl ? 'Αντιγραφή' : 'Copy'}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {room.sharedTool && room.sharedTool !== activeTool && (
                <button
                  type="button"
                  onClick={() => onFollowSharedTool?.(room.sharedTool!)}
                  className="ws-link-action text-xs w-full text-left"
                >
                  {isEl ? 'Ακολούθησε εργαλείο:' : 'Follow shared tool:'}{' '}
                  {workspaceToolLabel(room.sharedTool as WorkspaceToolId, lang)}
                </button>
              )}
              <ul className="space-y-1.5" data-testid="study-room-members">
                {room.members.map((m) => (
                  <li key={m.id} className={`rounded-lg border px-3 py-2 text-xs ${m.id === memberId ? 'ws-chip-brand' : 'ws-chip-neutral'}`}>
                    <span className="font-medium">{m.displayName}</span>
                    {m.id === memberId && <span className="text-text-muted"> ({isEl ? 'εσύ' : 'you'})</span>}
                    {(m.tool || m.concept) && (
                      <p className="text-text-muted mt-0.5 truncate">
                        {m.tool ? workspaceToolLabel(m.tool as WorkspaceToolId, lang) : ''}
                        {m.tool && m.concept ? ' · ' : ''}
                        {m.concept ?? ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <p className="ws-field-label">{isEl ? 'Βιντεοκλήση' : 'Video call'}</p>
                {showVideo ? (
                  <JitsiMeetEmbed roomName={room.jitsiRoom} lang={lang} />
                ) : (
                  <button type="button" onClick={() => setShowVideo(true)} className="ws-empty-cta-secondary w-full justify-center gap-2">
                    <Video className="h-3.5 w-3.5" />
                    {isEl ? 'Εμφάνιση βίντεο' : 'Show video'}
                  </button>
                )}
                {showVideo && (
                  <button type="button" onClick={() => setShowVideo(false)} className="ws-chrome-btn text-[10px]">
                    {isEl ? 'Απόκρυψη βίντεο' : 'Hide video'}
                  </button>
                )}
              </div>
              <button type="button" onClick={handleLeave} className="ws-empty-cta-secondary w-full justify-center gap-2">
                <LogOut className="h-3.5 w-3.5" />
                {isEl ? 'Αποχώρηση' : 'Leave room'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
