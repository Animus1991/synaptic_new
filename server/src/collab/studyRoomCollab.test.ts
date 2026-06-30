import { describe, expect, it } from 'vitest';
import { studyRoomDocumentName } from '../collab/studyRoomCollab';

describe('studyRoomCollab', () => {
  it('studyRoomDocumentName prefixes room id', () => {
    expect(studyRoomDocumentName('abc-123')).toBe('study-room-abc-123');
  });
});
