import { describe, expect, it } from 'vitest';
import { mergeSharedAnnotations } from './annotationRealtimeSync';
import type { SharedAnnotationDto } from './authClient';

const ann = (id: string): SharedAnnotationDto => ({
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
});

describe('annotationRealtimeSync', () => {
  it('merges without duplicate ids', () => {
    const merged = mergeSharedAnnotations([ann('1')], [ann('1'), ann('2')]);
    expect(merged).toHaveLength(2);
    expect(merged.map((a) => a.id)).toEqual(['1', '2']);
  });
});
