import { useCallback, useEffect, useRef, useState } from 'react';
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

const HEARTBEAT_MS = 25_000;

type Args = {
  open: boolean;
  lang: 'en' | 'el';
  courseId?: string;
  courseName?: string;
  activeTool: WorkspaceToolId;
  focusConcept?: string;
  userSettings?: UserSettings;
  onFollowSharedTool?: (tool: string) => void;
};

export function useStudyRoomSession({
  open,
  lang,
  courseId,
  courseName,
  activeTool,
  focusConcept,
  userSettings,
  onFollowSharedTool,
}: Args) {
  const isEl = lang === 'el';
  const [room, setRoom] = useState<StudyRoomSnapshot | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('synapse-display-name') ?? '');
  const [inviteInput, setInviteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<StudyRoomApiStatus | null>(null);
  const lastSharedRef = useRef<{ tool?: string }>({});

  const effectiveCourseId = courseId ?? 'workspace-session';

  useEffect(() => {
    if (!open) return;
    void checkStudyRoomApi(userSettings).then(setApiStatus);
  }, [open, userSettings]);

  const restoreSession = useCallback(async () => {
    const session = loadStudyRoomSession();
    if (!session || !displayName.trim()) return;
    try {
      const result = await joinStudyRoomByInvite(session.inviteCode, displayName, userSettings, session.memberId);
      setRoom(result.room);
      setMemberId(result.memberId);
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

  useEffect(() => {
    if (open) void restoreSession();
  }, [open, restoreSession]);

  useEffect(() => {
    if (!room?.id) return;
    return subscribeStudyRoomStream(room.id, userSettings, setRoom);
  }, [room?.id, userSettings]);

  useEffect(() => {
    if (!room?.id || !memberId) return;
    void updateStudyRoomPresence(room.id, memberId, { tool: activeTool, concept: focusConcept }, userSettings).catch(() => {});
  }, [room?.id, memberId, activeTool, focusConcept, userSettings]);

  useEffect(() => {
    if (!room?.id || !memberId) return;
    const tick = () => {
      void updateStudyRoomPresence(room.id, memberId, { heartbeat: true }, userSettings).catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [room?.id, memberId, userSettings]);

  useEffect(() => {
    if (!room?.sharedTool || room.sharedTool === activeTool) return;
    if (lastSharedRef.current.tool === room.sharedTool) return;
    lastSharedRef.current.tool = room.sharedTool;
    onFollowSharedTool?.(room.sharedTool);
  }, [room?.sharedTool, activeTool, onFollowSharedTool]);

  const persistJoin = (result: { room: StudyRoomSnapshot; memberId: string }) => {
    setRoom(result.room);
    setMemberId(result.memberId);
    saveStudyRoomSession({
      roomId: result.room.id,
      memberId: result.memberId,
      inviteCode: result.room.inviteCode,
      localOnly: result.room.localOnly,
    });
  };

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError(isEl ? 'Βάλε όνομα εμφάνισης.' : 'Enter a display name.');
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
      persistJoin(joined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteInput.trim() || !displayName.trim()) {
      setError(isEl ? 'Κωδικός πρόσκλησης και όνομα απαιτούνται.' : 'Invite code and display name required.');
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
      persistJoin(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () => {
    setRoom(null);
    setMemberId(null);
    saveStudyRoomSession(null);
  };

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
  };
}
