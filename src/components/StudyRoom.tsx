import { useCallback, useEffect, useState } from 'react';
import { Copy } from '@/lib/lucide-shim';
import type { UserSettings } from '../types';
import { useI18n } from '../lib/i18n';
import {
  checkStudyRoomApi,
  createAndJoinStudyRoom,
  joinStudyRoomByInvite,
  loadStudyRoomSession,
  saveStudyRoomSession,
  subscribeStudyRoomStream,
  type StudyRoomApiStatus,
  type StudyRoomSnapshot,
} from '../lib/studyRoomClient';
import { Page, PageHeader, Card, SectionHeading, PrimaryCTA, SecondaryCTA } from './ui/primitives';

type Props = {
  userSettings?: UserSettings;
  /** Opens the Study Hub (Study Workspace) so the collaborative session runs on top of it. */
  onOpenWorkspace: () => void;
};

/* OPT-K127 / OPT-K161 — wash fields (no outline cage); quiet focus ring; equal control height */
const fieldClass =
  'w-full min-h-8 rounded-lg border-0 bg-surface-secondary/55 px-3 py-2 type-caption text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35';

/** Study Room lobby — create/join a collaborative co-reading session, then enter the Study Hub. */
export function StudyRoom({ userSettings, onOpenWorkspace }: Props) {
  const { t } = useI18n();
  const [apiStatus, setApiStatus] = useState<StudyRoomApiStatus | null>(null);
  const [room, setRoom] = useState<StudyRoomSnapshot | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('synapse-display-name') ?? '');
  const [inviteInput, setInviteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void checkStudyRoomApi(userSettings).then((status) => {
      if (!cancelled) setApiStatus(status);
    });
    return () => { cancelled = true; };
  }, [userSettings]);

  // Resume a saved room so the lobby reflects the live session the workspace shares.
  useEffect(() => {
    if (room) return;
    const session = loadStudyRoomSession();
    const name = localStorage.getItem('synapse-display-name');
    if (!session || !name?.trim()) return;
    let cancelled = false;
    void joinStudyRoomByInvite(session.inviteCode, name, userSettings, session.memberId)
      .then((result) => {
        if (cancelled) return;
        setRoom(result.room);
        setMemberId(result.memberId);
        saveStudyRoomSession({
          roomId: result.room.id,
          memberId: result.memberId,
          inviteCode: result.room.inviteCode,
          localOnly: result.room.localOnly,
        });
      })
      .catch(() => {
        if (!cancelled) saveStudyRoomSession(null);
      });
    return () => { cancelled = true; };
  }, [room, userSettings]);

  useEffect(() => {
    if (!room?.id) return;
    return subscribeStudyRoomStream(room.id, userSettings, setRoom);
  }, [room?.id, userSettings]);

  const persistJoin = useCallback((result: { room: StudyRoomSnapshot; memberId: string }) => {
    setRoom(result.room);
    setMemberId(result.memberId);
    saveStudyRoomSession({
      roomId: result.room.id,
      memberId: result.memberId,
      inviteCode: result.room.inviteCode,
      localOnly: result.room.localOnly,
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!displayName.trim()) {
      setError(t('studyRoomEnterDisplayName'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem('synapse-display-name', displayName.trim());
      const joined = await createAndJoinStudyRoom(
        'study-room-hub',
        t('navStudyRoom'),
        displayName.trim(),
        userSettings,
      );
      persistJoin(joined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [displayName, persistJoin, t, userSettings]);

  const handleJoin = useCallback(async () => {
    if (!inviteInput.trim() || !displayName.trim()) {
      setError(t('studyRoomInviteRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem('synapse-display-name', displayName.trim());
      const result = await joinStudyRoomByInvite(inviteInput.trim(), displayName.trim(), userSettings);
      persistJoin(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [displayName, inviteInput, persistJoin, t, userSettings]);

  const handleLeave = useCallback(() => {
    setRoom(null);
    setMemberId(null);
    saveStudyRoomSession(null);
  }, []);

  const copyInvite = useCallback(async () => {
    if (!room?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(room.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard optional */
    }
  }, [room?.inviteCode]);

  const isLocal = apiStatus?.localFallback || room?.localOnly;

  /* OPT-K161 — text-first feature rows (titles carry meaning; no decorative Lucide) */
  const features: { title: string; desc: string }[] = [
    { title: t('studyRoomHubFeatureCoRead'), desc: t('studyRoomHubFeatureCoReadDesc') },
    { title: t('studyRoomHubFeatureNotes'), desc: t('studyRoomHubFeatureNotesDesc') },
    { title: t('studyRoomHubFeatureVideo'), desc: t('studyRoomHubFeatureVideoDesc') },
  ];

  const steps: { title: string; body: string }[] = [
    { title: t('studyRoomHubStep1Title'), body: t('studyRoomHubStep1Body') },
    { title: t('studyRoomHubStep2Title'), body: t('studyRoomHubStep2Body') },
    { title: t('studyRoomHubStep3Title'), body: t('studyRoomHubStep3Body') },
  ];

  return (
    <div
      className="w-full max-w-none"
      data-testid="study-room-page"
      data-type-rhythm="dashboard"
      /* OPT-K127 / OPT-K161 — Study Room clarity: CTA-only border diet */
      data-border-diet="cta-only"
      data-clarity-pass="k161"
    >
    <Page gap="sm">
      <PageHeader
        eyebrow={t('studyRoomHubLead')}
        title={t('navStudyRoom')}
        subtitle={t('navSubtitleStudyRoom')}
      />

      {/* OPT-K127 — balanced 3/2 columns; OPT-K161 — denser text-first explainer */}
      <div className="grid gap-3 lg:grid-cols-5 lg:items-start" data-testid="study-room-hub-grid">
        <div className="space-y-3 lg:col-span-3">
          <Card tone="brand" padding="md" className="study-room-panel">
            {/* OPT-K164 — same heading step as Features/How (no lg jump vs body ladder) */}
            <SectionHeading title={t('studyRoomHubWhatTitle')} />
            <p className="mt-2 type-caption leading-relaxed text-text-secondary">{t('studyRoomHubWhatBody')}</p>
            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border-0 px-2 py-0.5 type-caption font-medium ${
                isLocal
                  ? 'bg-accent-amber/10 text-text-secondary'
                  : 'bg-surface-secondary/70 text-text-secondary'
              }`}
              data-testid="study-room-hub-status"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLocal ? 'bg-accent-amber' : 'bg-accent-teal'}`} />
              {isLocal ? t('studyRoomHubServerLocal') : t('studyRoomHubServerOnline')}
            </span>
          </Card>

          <Card padding="md" className="study-room-panel">
            <SectionHeading title={t('studyRoomHubFeaturesTitle')} />
            <ul className="mt-3 grid gap-2 sm:grid-cols-3 sm:items-stretch" data-testid="study-room-feature-grid">
              {features.map(({ title, desc }) => (
                <li
                  key={title}
                  className="flex h-full flex-col rounded-xl border-0 bg-surface-secondary/45 p-3"
                >
                  <p className="type-caption font-semibold leading-snug text-text-primary">{title}</p>
                  <p className="mt-1 type-caption leading-relaxed text-text-muted">{desc}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md" className="study-room-panel">
            <SectionHeading title={t('studyRoomHubHowTitle')} />
            <ol className="mt-3 space-y-2.5">
              {steps.map(({ title, body }, i) => (
                <li key={title} className="flex items-start gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-0 bg-surface-secondary/70 type-caption font-semibold tabular-nums text-text-secondary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="type-caption font-semibold leading-snug text-text-primary">{title}</p>
                    <p className="mt-0.5 type-caption leading-relaxed text-text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4 space-y-3">
            {error && (
              <div
                className="rounded-lg border-0 bg-accent-rose/10 px-3 py-2 type-caption text-accent-rose"
                role="alert"
              >
                {error}
              </div>
            )}

            {room ? (
              <Card padding="md" className="study-room-panel space-y-3" data-testid="study-room-hub-active">
                <SectionHeading title={t('studyRoomHubInRoom')} />
                <div className="rounded-lg border-0 bg-surface-secondary/55 px-3 py-2">
                  <p className="truncate type-caption font-semibold text-text-primary">{room.name}</p>
                  <p className="type-caption text-text-muted">
                    {room.members.length} {t('studyRoomMembersOnline')}
                    {room.localOnly ? t('studyRoomLocalSuffix') : ''}
                  </p>
                </div>

                <div>
                  <p className="type-caption font-semibold text-text-primary">{t('studyRoomHubInviteTitle')}</p>
                  <p className="mb-2 type-caption leading-relaxed text-text-muted">
                    {copied ? t('studyRoomCopied') : t('studyRoomInviteExplain')}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-h-8 rounded-lg border-0 bg-surface-secondary/55 px-3 py-2 font-mono type-caption text-text-primary">
                      {room.inviteCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyInvite()}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-0 bg-surface-secondary/55 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                      title={t('studyRoomCopy')}
                      aria-label={t('studyRoomCopy')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 type-caption font-semibold text-text-primary">{t('studyRoomHubMembersHere')}</p>
                  <ul className="space-y-1" data-testid="study-room-hub-members">
                    {room.members.map((m) => (
                      <li
                        key={m.id}
                        className={`rounded-lg border-0 px-3 py-1.5 type-caption ${
                          m.id === memberId
                            ? 'bg-surface-secondary/70 text-text-primary'
                            : 'bg-surface-secondary/40 text-text-secondary'
                        }`}
                      >
                        <span className="font-medium">{m.displayName}</span>
                        {m.id === memberId && <span className="text-text-muted"> ({t('studyRoomYou')})</span>}
                        {m.leading && <span className="text-text-muted"> · {t('studyRoomLeadingBadge')}</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-0.5">
                  <PrimaryCTA
                    onClick={onOpenWorkspace}
                    className="w-full min-h-8"
                    data-testid="study-room-hub-open-workspace"
                  >
                    {t('studyRoomHubOpenWorkspace')}
                  </PrimaryCTA>
                  <p className="text-center type-caption text-text-muted">{t('studyRoomHubOpenWorkspaceHint')}</p>
                  <SecondaryCTA onClick={handleLeave} className="w-full min-h-8" size="sm">
                    {t('studyRoomLeave')}
                  </SecondaryCTA>
                  <p className="text-center type-caption text-text-muted">{t('studyRoomHubLeaveHint')}</p>
                </div>
              </Card>
            ) : (
              <Card padding="md" className="study-room-panel space-y-4" data-testid="study-room-hub-lobby">
                <div>
                  <SectionHeading title={t('studyRoomHubStep1Title')} />
                  <label className="mt-2 block">
                    <span className="mb-1 block type-caption font-medium text-text-secondary">
                      {t('studyRoomHubNameLabel')}
                    </span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={fieldClass}
                      placeholder={t('studyRoomDisplayNamePlaceholder')}
                      autoComplete="nickname"
                      data-testid="study-room-hub-name"
                    />
                  </label>
                  <p className="mt-1 type-caption leading-relaxed text-text-muted">{t('studyRoomHubNameHelp')}</p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleCreate();
                  }}
                >
                  <p className="mb-2 type-caption font-semibold text-text-primary">{t('studyRoomHubCreateTitle')}</p>
                  <PrimaryCTA
                    type="submit"
                    disabled={busy}
                    aria-busy={busy || undefined}
                    className="w-full min-h-8"
                    data-testid="study-room-hub-create"
                  >
                    {busy ? t('studyRoomCreating') : t('studyRoomNewRoom')}
                  </PrimaryCTA>
                  <p className="mt-1 type-caption leading-relaxed text-text-muted">{t('studyRoomHubCreateHint')}</p>
                </form>

                {/* OPT-K127 — spacing divider (no hairline rule) */}
                <div className="py-0.5 text-center type-caption text-text-muted" data-testid="study-room-or-divider">
                  {t('studyRoomOr')}
                </div>

                <div>
                  <p className="mb-2 type-caption font-semibold text-text-primary">{t('studyRoomHubJoinTitle')}</p>
                  <label className="block">
                    <span className="mb-1 block type-caption font-medium text-text-secondary">
                      {t('studyRoomInviteCode')}
                    </span>
                    <input
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value)}
                      className={`${fieldClass} font-mono`}
                      placeholder="a1b2c3d4"
                      data-testid="study-room-hub-invite"
                    />
                  </label>
                  <p className="mt-1 mb-2 type-caption leading-relaxed text-text-muted">{t('studyRoomHubJoinHelp')}</p>
                  <SecondaryCTA
                    onClick={() => void handleJoin()}
                    disabled={busy}
                    aria-busy={busy || undefined}
                    className="w-full min-h-8 bg-surface-secondary/55 font-medium text-text-primary hover:bg-surface-hover"
                    data-testid="study-room-hub-join"
                  >
                    {busy ? t('studyRoomJoining') : t('studyRoomJoinRoom')}
                  </SecondaryCTA>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Page>
    </div>
  );
}
