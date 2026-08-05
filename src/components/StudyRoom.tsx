import { useCallback, useEffect, useState } from 'react';
import {
  Users, BookOpen, Video, StickyNote, Copy, Plus, LogOut, ArrowRight, HelpCircle, Eye,
} from '@/lib/lucide-shim';
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

const fieldClass =
  'w-full rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none';

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

  const features: { icon: typeof BookOpen; title: string; desc: string }[] = [
    { icon: Eye, title: t('studyRoomHubFeatureCoRead'), desc: t('studyRoomHubFeatureCoReadDesc') },
    { icon: StickyNote, title: t('studyRoomHubFeatureNotes'), desc: t('studyRoomHubFeatureNotesDesc') },
    { icon: Video, title: t('studyRoomHubFeatureVideo'), desc: t('studyRoomHubFeatureVideoDesc') },
  ];

  const steps: { title: string; body: string }[] = [
    { title: t('studyRoomHubStep1Title'), body: t('studyRoomHubStep1Body') },
    { title: t('studyRoomHubStep2Title'), body: t('studyRoomHubStep2Body') },
    { title: t('studyRoomHubStep3Title'), body: t('studyRoomHubStep3Body') },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow={t('studyRoomHubLead')}
        title={t('navStudyRoom')}
        subtitle={t('navSubtitleStudyRoom')}
        icon={Users}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left: plain-language explainer, features, how-it-works */}
        <div className="space-y-4 lg:col-span-3">
          <Card tone="brand" padding="lg">
            <SectionHeading title={t('studyRoomHubWhatTitle')} icon={Users} size="lg" />
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{t('studyRoomHubWhatBody')}</p>
            <span
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 type-caption font-medium ${
                isLocal
                  ? 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber'
                  : 'border-accent-teal/30 bg-accent-teal/10 text-accent-teal'
              }`}
              data-testid="study-room-hub-status"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLocal ? 'bg-accent-amber' : 'bg-accent-teal'}`} />
              {isLocal ? t('studyRoomHubServerLocal') : t('studyRoomHubServerOnline')}
            </span>
          </Card>

          <Card padding="lg">
            <SectionHeading title={t('studyRoomHubFeaturesTitle')} icon={BookOpen} />
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {features.map(({ icon: Icon, title, desc }) => (
                <li
                  key={title}
                  className="rounded-xl border border-border-subtle bg-surface-secondary/50 p-3"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-border-subtle bg-surface-card text-brand-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2.5 text-sm font-semibold leading-snug text-text-primary">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{desc}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg">
            <SectionHeading title={t('studyRoomHubHowTitle')} icon={HelpCircle} />
            <ol className="mt-4 space-y-3">
              {steps.map(({ title, body }, i) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-500">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-snug text-text-primary">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Right: lobby actions */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4 space-y-3">
            {error && (
              <div
                className="rounded-lg border border-accent-rose/30 bg-accent-rose/10 px-3 py-2 text-xs text-accent-rose"
                role="alert"
              >
                {error}
              </div>
            )}

            {room ? (
              <Card padding="lg" className="space-y-4" data-testid="study-room-hub-active">
                <SectionHeading title={t('studyRoomHubInRoom')} icon={Users} />
                <div className="rounded-lg border border-border-subtle bg-surface-secondary/60 px-3 py-2 text-sm">
                  <p className="truncate font-semibold text-text-primary">{room.name}</p>
                  <p className="text-xs text-text-muted">
                    {room.members.length} {t('studyRoomMembersOnline')}
                    {room.localOnly ? t('studyRoomLocalSuffix') : ''}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-text-primary">{t('studyRoomHubInviteTitle')}</p>
                  <p className="mb-2 type-caption leading-relaxed text-text-muted">
                    {copied ? t('studyRoomCopied') : t('studyRoomInviteExplain')}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2 font-mono text-sm text-text-primary">
                      {room.inviteCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyInvite()}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border-subtle text-text-secondary transition-colors hover:text-text-primary"
                      title={t('studyRoomCopy')}
                      aria-label={t('studyRoomCopy')}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-semibold text-text-primary">{t('studyRoomHubMembersHere')}</p>
                  <ul className="space-y-1.5" data-testid="study-room-hub-members">
                    {room.members.map((m) => (
                      <li
                        key={m.id}
                        className={`rounded-lg border px-3 py-1.5 text-xs ${
                          m.id === memberId
                            ? 'border-brand-500/30 bg-brand-500/5 text-text-primary'
                            : 'border-border-subtle text-text-secondary'
                        }`}
                      >
                        <span className="font-medium">{m.displayName}</span>
                        {m.id === memberId && <span className="text-text-muted"> ({t('studyRoomYou')})</span>}
                        {m.leading && <span className="text-text-muted"> · {t('studyRoomLeadingBadge')}</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-1">
                  <PrimaryCTA
                    onClick={onOpenWorkspace}
                    className="w-full"
                    data-testid="study-room-hub-open-workspace"
                  >
                    {t('studyRoomHubOpenWorkspace')}
                    <ArrowRight className="h-4 w-4" />
                  </PrimaryCTA>
                  <p className="text-center type-caption text-text-muted">{t('studyRoomHubOpenWorkspaceHint')}</p>
                  <SecondaryCTA onClick={handleLeave} className="w-full" size="sm">
                    <LogOut className="h-3.5 w-3.5" />
                    {t('studyRoomLeave')}
                  </SecondaryCTA>
                  <p className="text-center type-caption text-text-muted">{t('studyRoomHubLeaveHint')}</p>
                </div>
              </Card>
            ) : (
              <Card padding="lg" className="space-y-5" data-testid="study-room-hub-lobby">
                {/* Step 1: name */}
                <div>
                  <SectionHeading title={t('studyRoomHubStep1Title')} icon={Users} />
                  <label className="mt-2 block">
                    <span className="mb-1 block type-caption font-medium uppercase tracking-wide text-text-muted">
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

                {/* Step 2a: create */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleCreate();
                  }}
                >
                  <p className="mb-2 text-sm font-semibold text-text-primary">{t('studyRoomHubCreateTitle')}</p>
                  <PrimaryCTA
                    type="submit"
                    disabled={busy}
                    aria-busy={busy || undefined}
                    className="w-full"
                    data-testid="study-room-hub-create"
                  >
                    <Plus className="h-4 w-4" />
                    {busy ? t('studyRoomCreating') : t('studyRoomNewRoom')}
                  </PrimaryCTA>
                  <p className="mt-1 type-caption leading-relaxed text-text-muted">{t('studyRoomHubCreateHint')}</p>
                </form>

                <div className="relative py-1 text-center type-micro text-text-muted">
                  <span className="relative z-10 bg-surface-card px-2">{t('studyRoomOr')}</span>
                  <div className="absolute inset-x-0 top-1/2 border-t border-border-subtle" />
                </div>

                {/* Step 2b: join */}
                <div>
                  <p className="mb-2 text-sm font-semibold text-text-primary">{t('studyRoomHubJoinTitle')}</p>
                  <label className="block">
                    <span className="mb-1 block type-caption font-medium uppercase tracking-wide text-text-muted">
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
                    className="w-full"
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
  );
}
