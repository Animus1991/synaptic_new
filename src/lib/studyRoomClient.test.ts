import { describe, expect, it } from 'vitest';
import { jitsiMeetUrl } from './studyRoomClient';

describe('studyRoomClient', () => {
  it('jitsiMeetUrl encodes room name', () => {
    const url = jitsiMeetUrl('synapse-algebra-abc123');
    expect(url).toContain('meet.jit.si');
    expect(url).toContain('synapse-algebra-abc123');
    expect(url).toContain('prejoinPageEnabled=false');
  });
});
