import { describe, expect, it } from 'vitest';
import { parseConceptMapDocumentName, resolveCollabRoomId } from './documentNames';

describe('collab documentNames', () => {
  it('resolveCollabRoomId parses study room documents', () => {
    expect(resolveCollabRoomId('study-room-abc-123')).toBe('abc-123');
  });

  it('resolveCollabRoomId parses concept map documents', () => {
    const roomId = '550e8400-e29b-41d4-a716-446655440000';
    const name = `concept-map-${roomId}__${encodeURIComponent('elasticity')}`;
    expect(resolveCollabRoomId(name)).toBe(roomId);
    expect(parseConceptMapDocumentName(name)?.conceptKey).toBe('elasticity');
  });
});
