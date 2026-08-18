import type { AppView } from '../types';

/** Views where Focus study should strip secondary chrome. Admin/prefs stay full. */
const FOCUS_STUDY_VIEWS = new Set<AppView>([
  'dashboard',
  'library',
  'tasks',
  'agent',
  'study-room',
  'analytics',
  'course',
  'exam-prep',
  'note-analysis',
]);

export function isFocusStudyView(view: AppView, studyWorkspaceOpen = false): boolean {
  if (studyWorkspaceOpen) return true;
  return FOCUS_STUDY_VIEWS.has(view);
}
