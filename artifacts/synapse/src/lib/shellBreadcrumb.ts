import type { AppView } from '../types';
import type { I18nKey } from './i18n';
import { getShellViewLabelKey } from './navigationRegistry';

export type ShellBreadcrumbProps = {
  course?: string;
  lesson?: string;
  viewLabel?: string;
};

export function buildShellBreadcrumb(input: {
  currentView: AppView;
  t: (key: I18nKey) => string;
  courseTitle?: string;
  lessonLabel?: string;
  taskCourse?: string;
  taskTitle?: string;
}): ShellBreadcrumbProps | undefined {
  if (input.currentView === 'course' && input.courseTitle) {
    return { course: input.courseTitle };
  }
  if (input.currentView === 'note-analysis' && input.courseTitle) {
    return {
      course: input.courseTitle,
      lesson: input.lessonLabel ?? input.t('breadcrumbNoteAnalysis'),
    };
  }
  if (input.taskCourse && input.taskTitle) {
    return { course: input.taskCourse, lesson: input.taskTitle };
  }
  if (input.courseTitle && !input.taskTitle) {
    return { course: input.courseTitle };
  }
  const labelKey = getShellViewLabelKey(input.currentView);
  if (labelKey) {
    return { viewLabel: input.t(labelKey) };
  }
  return undefined;
}
