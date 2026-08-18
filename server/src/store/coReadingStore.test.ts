import { beforeEach, describe, expect, it } from 'vitest';
import { emptyCoReadingHub, parseCoReadingHub } from '../lib/coReadingHubMerge';
import {
  getCoReadingHubAsync,
  resetCoReadingStore,
  upsertCoReadingHubAsync,
} from './coReadingStore';
import { createStudyRoom } from './studyRoomStore';

const emptyVotes = { clarity: 0, sourceGrounding: 0, completeness: 0, examUsefulness: 0 };

describe('coReadingStore', () => {
  beforeEach(() => {
    resetCoReadingStore();
  });

  it('returns an empty hub for a new room', async () => {
    const room = createStudyRoom('c1', 'Room');
    const hub = await getCoReadingHubAsync(room.id);
    expect(hub).toEqual(emptyCoReadingHub(room.id));
  });

  it('merges concurrent device writes so votes and challenges union', async () => {
    const room = createStudyRoom('c1', 'Room');
    await upsertCoReadingHubAsync(room.id, {
      roomId: room.id,
      challenges: [{
        id: 'xc-a',
        roomId: room.id,
        sourceExcerpt: 'Elasticity measures demand response.',
        sourceRef: '',
        explanations: [{
          id: 'ex-1',
          authorId: 'u1',
          authorName: 'Ada',
          text: 'Demand sensitivity to price.',
          aiAssisted: false,
          votes: { ...emptyVotes, clarity: 2 },
          voterIds: ['u2'],
          createdAt: '2026-08-15T10:00:00.000Z',
          contentHash: 'h1',
          readReceiptIds: ['u2'],
        }],
        exemplarId: null,
        createdById: 's1',
        createdByName: 'Sam',
        createdAt: '2026-08-15T09:00:00.000Z',
        events: [],
      }],
    });
    const merged = await upsertCoReadingHubAsync(room.id, {
      roomId: room.id,
      challenges: [{
        id: 'xc-b',
        roomId: room.id,
        sourceExcerpt: 'A second excerpt for another challenge.',
        sourceRef: '',
        explanations: [],
        exemplarId: null,
        createdById: 's2',
        createdByName: 'Bea',
        createdAt: '2026-08-15T11:00:00.000Z',
        events: [],
      }],
    });
    expect(merged.challenges.map((ch) => ch.id).sort()).toEqual(['xc-a', 'xc-b']);
    const shared = merged.challenges.find((ch) => ch.id === 'xc-a')!;
    expect(shared.explanations[0]!.votes.clarity).toBe(2);
  });

  it('rejects a payload that is not a hub', () => {
    expect(parseCoReadingHub({ nope: true }, 'r1')).toBeNull();
    expect(parseCoReadingHub({ challenges: [] }, 'r1')).toEqual({ roomId: 'r1', challenges: [] });
  });
});
