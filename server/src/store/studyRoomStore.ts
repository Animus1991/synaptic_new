import { randomBytes, randomUUID } from 'node:crypto';

export type StudyRoomMember = {
  id: string;
  displayName: string;
  tool?: string;
  concept?: string;
  stepIndex?: number;
  leading?: boolean;
  cursorX?: number;
  cursorY?: number;
  lastSeen: number;
};

export type StudyRoomSnapshot = {
  id: string;
  courseId: string;
  name: string;
  inviteCode: string;
  jitsiRoom: string;
  members: StudyRoomMember[];
  sharedTool?: string;
  sharedConcept?: string;
  sharedStep?: number;
  leaderId?: string;
  whiteboardVersion?: number;
  version: number;
  createdAt: string;
};

type InternalRoom = StudyRoomSnapshot & {
  memberIndex: Map<string, StudyRoomMember>;
};

const rooms = new Map<string, InternalRoom>();
const byInvite = new Map<string, string>();

function slugInvite(): string {
  return randomBytes(4).toString('hex');
}

function jitsiSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return `synapse-${base || 'room'}-${randomBytes(3).toString('hex')}`;
}

export function hydrateStudyRoom(room: StudyRoomSnapshot): void {
  const internal: InternalRoom = {
    ...room,
    memberIndex: new Map(room.members.map((m) => [m.id, m])),
  };
  rooms.set(room.id, internal);
  byInvite.set(room.inviteCode.toLowerCase(), room.id);
}

export function listStudyRoomSnapshots(): StudyRoomSnapshot[] {
  return [...rooms.values()].map(snapshot);
}

export function createStudyRoom(courseId: string, name: string): StudyRoomSnapshot {
  const id = randomUUID();
  let inviteCode = slugInvite();
  while (byInvite.has(inviteCode)) inviteCode = slugInvite();
  const room: InternalRoom = {
    id,
    courseId,
    name: name.trim() || 'Study room',
    inviteCode,
    jitsiRoom: jitsiSlug(name),
    members: [],
    memberIndex: new Map(),
    whiteboardVersion: 0,
    version: 1,
    createdAt: new Date().toISOString(),
  };
  rooms.set(id, room);
  byInvite.set(inviteCode.toLowerCase(), id);
  return snapshot(room);
}

export function getStudyRoomByInvite(inviteCode: string): StudyRoomSnapshot | undefined {
  const id = byInvite.get(inviteCode.trim().toLowerCase());
  if (!id) return undefined;
  const room = rooms.get(id);
  return room ? snapshot(room) : undefined;
}

export function getStudyRoom(roomId: string): StudyRoomSnapshot | undefined {
  const room = rooms.get(roomId);
  return room ? snapshot(room) : undefined;
}

function purgeStale(room: InternalRoom): void {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [id, m] of room.memberIndex) {
    if (m.lastSeen < cutoff) room.memberIndex.delete(id);
  }
  room.members = [...room.memberIndex.values()];
  // Co-view: a departed/stale leader must not pin followers to a dead viewport.
  if (room.leaderId && !room.memberIndex.has(room.leaderId)) room.leaderId = undefined;
}

function snapshot(room: InternalRoom): StudyRoomSnapshot {
  purgeStale(room);
  return {
    id: room.id,
    courseId: room.courseId,
    name: room.name,
    inviteCode: room.inviteCode,
    jitsiRoom: room.jitsiRoom,
    members: room.members,
    sharedTool: room.sharedTool,
    sharedConcept: room.sharedConcept,
    sharedStep: room.sharedStep,
    leaderId: room.leaderId,
    whiteboardVersion: room.whiteboardVersion,
    version: room.version,
    createdAt: room.createdAt,
  };
}

export function joinStudyRoom(
  roomId: string,
  displayName: string,
  memberId?: string,
): { room: StudyRoomSnapshot; memberId: string } | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const id = memberId && room.memberIndex.has(memberId) ? memberId : randomUUID();
  const member: StudyRoomMember = {
    id,
    displayName: displayName.trim() || 'Learner',
    lastSeen: Date.now(),
    tool: room.sharedTool,
    concept: room.sharedConcept,
  };
  room.memberIndex.set(id, member);
  room.members = [...room.memberIndex.values()];
  room.version += 1;
  return { room: snapshot(room), memberId: id };
}

export function updateStudyRoomPresence(
  roomId: string,
  memberId: string,
  patch: {
    tool?: string;
    concept?: string;
    stepIndex?: number;
    leading?: boolean;
    displayName?: string;
    cursorX?: number;
    cursorY?: number;
    heartbeat?: boolean;
  },
): StudyRoomSnapshot | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const member = room.memberIndex.get(memberId);
  if (!member) return undefined;
  if (patch.displayName) member.displayName = patch.displayName.trim() || member.displayName;
  if (patch.tool !== undefined) member.tool = patch.tool;
  if (patch.concept !== undefined) member.concept = patch.concept;
  if (typeof patch.stepIndex === 'number' && Number.isFinite(patch.stepIndex)) {
    member.stepIndex = Math.max(0, Math.floor(patch.stepIndex));
  }
  if (typeof patch.cursorX === 'number') member.cursorX = patch.cursorX;
  if (typeof patch.cursorY === 'number') member.cursorY = patch.cursorY;

  // Co-view: only the leader publishes the shared Study Hub viewport.
  // Legacy: if nobody claimed lead yet, first tool/concept update still seeds shared*.
  if (patch.leading === true) {
    member.leading = true;
    room.leaderId = memberId;
    for (const [id, m] of room.memberIndex) {
      if (id !== memberId) m.leading = false;
    }
    if (patch.tool !== undefined) room.sharedTool = patch.tool;
    if (patch.concept !== undefined) room.sharedConcept = patch.concept;
    if (typeof patch.stepIndex === 'number' && Number.isFinite(patch.stepIndex)) {
      room.sharedStep = Math.max(0, Math.floor(patch.stepIndex));
    }
  } else if (patch.leading === false) {
    member.leading = false;
    if (room.leaderId === memberId) room.leaderId = undefined;
  } else if (!room.leaderId) {
    if (patch.tool !== undefined) room.sharedTool = patch.tool;
    if (patch.concept !== undefined) room.sharedConcept = patch.concept;
    if (typeof patch.stepIndex === 'number' && Number.isFinite(patch.stepIndex)) {
      room.sharedStep = Math.max(0, Math.floor(patch.stepIndex));
    }
  } else if (room.leaderId === memberId) {
    if (patch.tool !== undefined) room.sharedTool = patch.tool;
    if (patch.concept !== undefined) room.sharedConcept = patch.concept;
    if (typeof patch.stepIndex === 'number' && Number.isFinite(patch.stepIndex)) {
      room.sharedStep = Math.max(0, Math.floor(patch.stepIndex));
    }
  }

  member.lastSeen = Date.now();
  room.version += 1;
  room.members = [...room.memberIndex.values()];
  return snapshot(room);
}

export function bumpStudyRoomWhiteboard(roomId: string): StudyRoomSnapshot | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  room.whiteboardVersion = (room.whiteboardVersion ?? 0) + 1;
  room.version += 1;
  return snapshot(room);
}

export function leaveStudyRoom(roomId: string, memberId: string): StudyRoomSnapshot | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  room.memberIndex.delete(memberId);
  room.members = [...room.memberIndex.values()];
  if (room.leaderId === memberId) room.leaderId = undefined;
  room.version += 1;
  return snapshot(room);
}

