import { describe, expect, it } from 'vitest';
import { mockUser } from '../demo/mockData';
import {
  canAccessShellView,
  filterNavigationRegistry,
  resolveNavCapabilities,
} from './navCapabilities';
import { isBookmarkableView, isShellNavView } from './navigationRegistry';

describe('navCapabilities', () => {
  it('grants teacher capability only for teacher role', () => {
    expect(resolveNavCapabilities({ ...mockUser, role: 'teacher' }).has('teacher')).toBe(true);
    expect(resolveNavCapabilities({ ...mockUser, role: 'self-learner', segment: 'selflearner' }).has('teacher')).toBe(false);
  });

  it('grants student-org for students and academic segments', () => {
    expect(resolveNavCapabilities({ ...mockUser, role: 'student', segment: 'university' }).has('student-org')).toBe(true);
    expect(resolveNavCapabilities({ ...mockUser, role: 'self-learner', segment: 'selflearner' }).has('student-org')).toBe(false);
  });

  it('filters teacher and student-org from self-learner nav', () => {
    const views = filterNavigationRegistry({
      ...mockUser,
      role: 'self-learner',
      segment: 'selflearner',
    }).map((e) => e.view);
    expect(views).not.toContain('teacher');
    expect(views).not.toContain('student-org');
    expect(views).toContain('dashboard');
  });

  it('blocks gated shell views for unauthorized users', () => {
    const learner = { ...mockUser, role: 'self-learner' as const, segment: 'selflearner' as const };
    expect(canAccessShellView('teacher', learner)).toBe(false);
    expect(canAccessShellView('library', learner)).toBe(true);
    expect(canAccessShellView('exam-prep', learner)).toBe(true);
  });

  it('treats exam-prep as bookmarkable without adding it to the sidebar registry', () => {
    expect(isShellNavView('exam-prep')).toBe(false);
    expect(isBookmarkableView('exam-prep')).toBe(true);
    expect(isBookmarkableView('dashboard')).toBe(true);
    expect(isBookmarkableView('course')).toBe(true);
    expect(isBookmarkableView('note-analysis')).toBe(true);
    expect(isBookmarkableView('landing')).toBe(false);
  });
});
