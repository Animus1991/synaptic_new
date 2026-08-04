import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n';
import type { UserSettings } from '../types';
import type { WorkspaceToolId } from '../lib/taskFlows';
import {
  checkStudyRoomApi,
  createAndJoinStudyRoom,
  joinStudyRoomByInvite,
  loadStudyRoomSession,
  saveStudyRoomSession,
  subscribeStudyRoomStream,
  updateStudyRoomPresence,
  type StudyRoomApiStatus,
  type StudyRoomSnapshot,
} from '../lib/studyRoomClient';
import {
  coViewActionKey,
  coViewFollowActions,
  describeCoViewStatus,
  hasCoViewAction,
  type CoViewViewport,
} from '../lib/studyRoomCoView';

const HEARTBEAT_MS = 25_000;

type Args = {
  open: boolean;
  lang: 'en' | 'el';
  courseId?: string;
  courseName?: string;
  activeTool: WorkspaceToolId;
  focusConcept?: string;
  currentStep?: number;
  userSettings?: UserSettings;
  onFollowSharedTool?: (tool: string) => void;
  onFollowSharedStep?: (stepIndex: number) => void;
  onFollowSharedConcept?: (concept: string) => void;
};

export function useStudyRoomSession({
  open,
  lang,
  courseId,
  courseName,
  activeTool,
  focusConcept,
  currentStep = 0,
  userSettings,
  onFollowSharedTool,
  onFollowSharedStep,
  onFollowSharedConcept,
}: Args) {
  const { t } = useI18n();
  const [room, setRoom] = useState<StudyRoomSnapshot | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('synapse-display-name') ?? '');
  const [inviteInput, setInviteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<StudyRoomApiStatus | null>(null);
  /** Creator leads by default; joiners follow until they claim lead. */
  const [leading, setLeading] = useState(false);
  const lastFollowKey = useRef('');

  const effectiveCourseId = courseId ?? 'workspace-session';

  useEffect(() => {
    // Probe API when opening the panel, or while an active room keeps co-view alive.
    if (!open && !room?.id) return;
    void checkStudyRoomApi(userSettings).then(setApiStatus);
  }, [open, room?.id, userSettings]);

  const restoreSession = useCallback(async () => {
    const session = loadStudyRoomSession();
    if (!session || !displayName.trim()) return;
    try {
      const result = await joinStudyRoomByInvite(session.inviteCode, displayName, userSettings, session.memberId);
      setRoom(result.room);
      setMemberId(result.memberId);
      setLeading(result.room.leaderId === result.memberId || !result.room.leaderId);
      saveStudyRoomSession({
        roomId: result.room.id,
        memberId: result.memberId,
        inviteCode: result.room.inviteCode,
        localOnly: result.room.localOnly,
      });
    } catch {
      saveStudyRoomSession(null);
    }
  }, [displayName, userSettings]);

  // Only restore when the sheet opens — not on every Study Hub mount (network + main-thread cost).
  useEffect(() => {
    if (open && !room) void restoreSession();
  }, [open, room, restoreSession]);

  useEffect(() => {
    if (!room?.id) return;
    return subscribeStudyRoomStream(room.id, userSettings, setRoom);
  }, [room?.id, userSettings]);

  useEffect(() => {
    if (!room?.id || !memberId) return;
    void updateStudyRoomPresence(
      room.id,
      memberId,
      {
        tool: activeTool,
        concept: focusConcept,
        stepIndex: currentStep,
        leading,
      },
      userSettings,
    ).catch(() => {});
  }, [room?.id, memberId, activeTool, focusConcept, currentStep, leading, userSettings]);

  useEffect(() => {
    if (!room?.id || !memberId) return;
    const tick = () => {
      void updateStudyRoomPresence(room.id, memberId, { heartbeat: true, leading }, userSettings).catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [room?.id, memberId, leading, userSettings]);

  // Follow shared Study Hub viewport when not leading.
  useEffect(() => {
    if (!room || !memberId || leading) return;
    if (room.leaderId && room.leaderId === memberId) return;
    const leader = room.members.find((m) => m.id === room.leaderId);
    const shared: CoViewViewport = {
      tool: room.sharedTool,
      concept: room.sharedConcept,
      stepIndex: room.sharedStep,
      leaderId: room.leaderId,
      leaderName: leader?.displayName,
    };
    const action = coViewFollowActions(shared, {
      tool: activeTool,
      concept: focusConcept,
      stepIndex: currentStep,
    });
    if (!hasCoViewAction(action)) return;
    const key = `${room.version}|${coViewActionKey(action)}`;
    if (lastFollowKey.current === key) return;
    lastFollowKey.current = key;
    if (action.tool) onFollowSharedTool?.(action.tool);
    if (typeof action.stepIndex === 'number') onFollowSharedStep?.(action.stepIndex);
    if (action.concept) onFollowSharedConcept?.(action.concept);
  }, [
    room,
    memberId,
    leading,
    activeTool,
    focusConcept,
    currentStep,
    onFollowSharedTool,
    onFollowSharedStep,
    onFollowSharedConcept,
  ]);

  const persistJoin = (result: { room: StudyRoomSnapshot; memberId: string }, asLeader: boolean) => {
    setRoom(result.room);
    setMemberId(result.memberId);
    setLeading(asLeader);
    saveStudyRoomSession({
      roomId: result.room.id,
      memberId: result.memberId,
      inviteCode: result.room.inviteCode,
      localOnly: result.room.localOnly,
    });
  };

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError(t('studyRoomEnterDisplayName'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem('synapse-display-name', displayName.trim());
      const joined = await createAndJoinStudyRoom(
        effectiveCourseId,
        courseName ?? 'Study room',
        displayName.trim(),
        userSettings,
      );
      persistJoin(joined, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteInput.trim() || !displayName.trim()) {
      setError(t('studyRoomInviteRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem('synapse-display-name', displayName.trim());
      const session = loadStudyRoomSession();
      const result = await joinStudyRoomByInvite(
        inviteInput.trim(),
        displayName.trim(),
        userSettings,
        session?.inviteCode === inviteInput.trim() ? session.memberId : undefined,
      );
      persistJoin(result, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () => {
    setRoom(null);
    setMemberId(null);
    setLeading(false);
    lastFollowKey.current = '';
    saveStudyRoomSession(null);
  };

  const claimLead = useCallback(() => setLeading(true), []);
  const followLead = useCallback(() => setLeading(false), []);

  const coViewViewport: CoViewViewport = useMemo(() => {
    const leader = room?.members.find((m) => m.id === room.leaderId);
    return {
      tool: room?.sharedTool,
      concept: room?.sharedConcept,
      stepIndex: room?.sharedStep,
      leaderId: room?.leaderId,
      leaderName: leader?.displayName,
    };
  }, [room]);

  const coViewMode: 'leading' | 'following' | 'solo' = !room
    ? 'solo'
    : leading
      ? 'leading'
      : 'following';
  const coViewStatus = describeCoViewStatus(lang, coViewMode, coViewViewport);

  return {
    room,
    memberId,
    displayName,
    setDisplayName,
    inviteInput,
    setInviteInput,
    busy,
    error,
    setError,
    apiStatus,
    handleCreate,
    handleJoin,
    handleLeave,
    leading,
    claimLead,
    followLead,
    coViewViewport,
    coViewStatus,
    coViewMode,
  };
}
