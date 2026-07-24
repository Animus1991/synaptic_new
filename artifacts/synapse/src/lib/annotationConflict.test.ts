import { describe, expect, it } from 'vitest';
import {
  mergeSharedAnnotationsWithConflicts,
  resolveAnnotationConflict,
} from './annotationConflict';
import type { SharedAnnotationDto } from './authClient';

function ann(partial: Partial<SharedAnnotationDto> & Pick<SharedAnnotationDto, 'id' | 'text'>): SharedAnnotationDto {
  return {
    courseId: 'c1',
    fileKey: 'f1',
    type: 'comment',
    color: '#fff',
    lineStart: 1,
    lineEnd: 1,
    teacherEmail: 't@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    revision: 1,
    ...partial,
  };
}

describe('annotationConflict', () => {
  it('merges new remote ids', () => {
    const { merged, conflicts } = mergeSharedAnnotationsWithConflicts(
      [ann({ id: 'a', text: 'one' })],
      [ann({ id: 'b', text: 'two' })],
    );
    expect(merged).toHaveLength(2);
    expect(conflicts).toHaveLength(0);
  });

  it('detects content divergence as conflict and keeps local', () => {
    const local = ann({ id: 'a', text: 'local note', revision: 1 });
    const remote = ann({ id: 'a', text: 'remote note', revision: 2, updatedAt: '2026-02-01T00:00:00.000Z' });
    const { merged, conflicts } = mergeSharedAnnotationsWithConflicts([local], [remote]);
    expect(conflicts).toHaveLength(1);
    expect(merged.find((m) => m.id === 'a')?.text).toBe('local note');
  });

  it('resolves conflict to remote', () => {
    const conflicts = [{
      id: 'a',
      local: ann({ id: 'a', text: 'L' }),
      remote: ann({ id: 'a', text: 'R' }),
      reason: 'content_divergence' as const,
    }];
    const { remaining, chosen } = resolveAnnotationConflict(conflicts, 'a', 'remote');
    expect(remaining).toHaveLength(0);
    expect(chosen?.text).toBe('R');
  });
});
