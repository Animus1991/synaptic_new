import { describe, expect, it } from 'vitest';
import {
  createStudyRoom,
  getStudyRoom,
  getStudyRoomByInvite,
  joinStudyRoom,
  leaveStudyRoom,
  updateStudyRoomPresence,
} from '../store/studyRoomStore';

describe('studyRoomStore', () => {
  it('creates room with invite code and jitsi slug', () => {
    const room = createStudyRoom('course-1', 'Algebra sprint');
    expect(room.courseId).toBe('course-1');
    expect(room.inviteCode).toMatch(/^[a-f0-9]{8}$/);
    expect(room.jitsiRoom).toMatch(/^synapse-/);
    expect(getStudyRoom(room.id)?.id).toBe(room.id);
    expect(getStudyRoomByInvite(room.inviteCode)?.id).toBe(room.id);
  });

  it('joins and broadcasts shared tool focus', () => {
    const room = createStudyRoom('c2', 'Room');
    const a = joinStudyRoom(room.id, 'Alice');
    expect(a?.memberId).toBeTruthy();
    const b = joinStudyRoom(room.id, 'Bob');
    expect(getStudyRoom(room.id)?.members).toHaveLength(2);

    const updated = updateStudyRoomPresence(room.id, a!.memberId, { tool: 'quiz', concept: 'limits' });
    expect(updated?.sharedTool).toBe('quiz');
    expect(updated?.sharedConcept).toBe('limits');

    leaveStudyRoom(room.id, b!.memberId);
    expect(getStudyRoom(room.id)?.members).toHaveLength(1);
  });
});
