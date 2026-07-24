import { isCourseTabId, writePersistedCourseTab, type CourseTabId } from './coursePageSelectors';

export type CourseDeepLinkParams = {
  courseId: string;
  tab: CourseTabId | null;
};

export function parseCourseDeepLink(search: URLSearchParams | string): CourseDeepLinkParams | null {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  if (params.get('view') !== 'course') return null;
  const courseId = params.get('course') ?? params.get('courseId');
  if (!courseId) return null;
  const tabRaw = params.get('tab');
  const tab = tabRaw && isCourseTabId(tabRaw) ? tabRaw : null;
  return { courseId, tab };
}

export function buildCourseDeepLinkQuery(courseId: string, tab?: CourseTabId): string {
  const params = new URLSearchParams({ view: 'course', course: courseId });
  if (tab) params.set('tab', tab);
  return params.toString();
}

export function syncCourseDeepLinkToUrl(courseId: string, tab: CourseTabId): void {
  if (typeof window === 'undefined') return;
  const qs = buildCourseDeepLinkQuery(courseId, tab);
  window.history.replaceState({}, '', `${window.location.pathname}?${qs}`);
}

export function clearCourseDeepLinkParams(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.delete('view');
  params.delete('course');
  params.delete('courseId');
  params.delete('tab');
  const qs = params.toString();
  window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

/** Apply tab hint before opening course view (sessionStorage persistence). */
export function seedCourseTabFromDeepLink(courseId: string, tab: CourseTabId | null): void {
  if (tab) writePersistedCourseTab(courseId, tab);
}
