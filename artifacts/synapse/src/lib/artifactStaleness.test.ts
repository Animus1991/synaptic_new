import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  acknowledgeStaleTool,
  clearCourseArtifactsStale,
  getStalePracticeTools,
  isToolArtifactStale,
  markCourseArtifactsStale,
} from './artifactStaleness';

describe('artifactStaleness', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    });
  });

  it('marks all practice tools stale after reprocess', () => {
    markCourseArtifactsStale('course-1', '2.4.0');
    expect(getStalePracticeTools('course-1')).toEqual(['quiz', 'leitner', 'simulator']);
    expect(isToolArtifactStale('course-1', 'quiz')).toBe(true);
  });

  it('acknowledges one tool at a time', () => {
    markCourseArtifactsStale('course-1', '2.4.0');
    acknowledgeStaleTool('course-1', 'quiz');
    expect(isToolArtifactStale('course-1', 'quiz')).toBe(false);
    expect(isToolArtifactStale('course-1', 'leitner')).toBe(true);
  });

  it('clears record when all tools acknowledged', () => {
    markCourseArtifactsStale('course-1', '2.4.0');
    acknowledgeStaleTool('course-1', 'quiz');
    acknowledgeStaleTool('course-1', 'leitner');
    acknowledgeStaleTool('course-1', 'simulator');
    expect(getStalePracticeTools('course-1')).toEqual([]);
  });

  it('clearCourseArtifactsStale removes course entry', () => {
    markCourseArtifactsStale('course-1', '2.4.0');
    clearCourseArtifactsStale('course-1');
    expect(isToolArtifactStale('course-1', 'quiz')).toBe(false);
  });
});
