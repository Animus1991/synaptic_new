/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildCourseDeepLinkQuery,
  parseCourseDeepLink,
  seedCourseTabFromDeepLink,
} from './courseDeepLink';
import { readPersistedCourseTab } from './coursePageSelectors';

describe('courseDeepLink', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('parseCourseDeepLink reads view/course/tab', () => {
    expect(parseCourseDeepLink('?view=course&course=abc&tab=sources')).toEqual({
      courseId: 'abc',
      tab: 'sources',
    });
    expect(parseCourseDeepLink('?view=library&course=abc')).toBeNull();
    expect(parseCourseDeepLink('?view=course')).toBeNull();
    expect(parseCourseDeepLink('?view=course&course=abc&tab=invalid')).toEqual({
      courseId: 'abc',
      tab: null,
    });
  });

  it('buildCourseDeepLinkQuery serializes course and tab', () => {
    expect(buildCourseDeepLinkQuery('course-1')).toBe('view=course&course=course-1');
    expect(buildCourseDeepLinkQuery('course-1', 'map')).toBe('view=course&course=course-1&tab=map');
  });

  it('seedCourseTabFromDeepLink writes session tab when provided', () => {
    seedCourseTabFromDeepLink('course-1', 'analytics');
    expect(readPersistedCourseTab('course-1')).toBe('analytics');
    seedCourseTabFromDeepLink('course-1', null);
    expect(readPersistedCourseTab('course-1')).toBe('analytics');
  });
});
