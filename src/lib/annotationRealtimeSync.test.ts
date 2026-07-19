import { describe, expect, it } from 'vitest';
import {
  mergeSharedAnnotations,
  mergeSharedAnnotationsWithConflicts,
  resolveAnnotationConflict,
} from './annotationRealtimeSync';
import type { SharedAnnotationDto } from './authClient';

const ann = (
  id: string,
  overrides: Partial<SharedAnnotationDto> = {},
): SharedAnnotationDto => ({
  id,
  courseId: 'c1',
  fileKey: 'f1',
  type: 'comment',
  text: `note ${id}`,
  color: '#818cf8',
  lineStart: 1,
  lineEnd: 2,
  teacherEmail: 't@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('annotationRealtimeSync', () => {
  it('merges without duplicate ids', () => {
    const merged = mergeSharedAnnotations([ann('1')], [ann('1'), ann('2')]);
    expect(merged).toHaveLength(2);
    expect(merged.map((a) => a.id)).toEqual(['1', '2']);
  });

  it('flags conflicts when same id diverges', () => {
    const local = ann('1', { text: 'local text' });
    const remote = ann('1', { text: 'remote text', lineStart: 3, lineEnd: 4 });
    const { merged, conflicts } = mergeSharedAnnotationsWithConflicts([local], [remote]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.text).toBe('remote text');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.local.text).toBe('local text');
  });

  it('resolveAnnotationConflict keeps chosen side', () => {
    const local = ann('1', { text: 'local' });
    const remote = ann('1', { text: 'remote' });
    const { merged, conflicts } = mergeSharedAnnotationsWithConflicts([local], [remote]);
    const resolved = resolveAnnotationConflict(conflicts, '1', 'local', merged);
    expect(resolved.conflicts).toHaveLength(0);
    expect(resolved.merged[0]!.text).toBe('local');
  });
});
