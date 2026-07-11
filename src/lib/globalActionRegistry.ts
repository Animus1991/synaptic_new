import type { I18nKey } from './i18n';

export type GlobalQuickActionId = 'note-analysis' | 'upload' | 'workspace' | 'exam';

export type GlobalQuickAction = {
  id: GlobalQuickActionId;
  labelKey: I18nKey;
  showInQuickAccess: boolean;
  showInPalette: boolean;
  /** Hide from Quick Access when user has no courses (upload/workspace still OK). */
  requiresCourses?: boolean;
};

export const GLOBAL_QUICK_ACTIONS: GlobalQuickAction[] = [
  {
    id: 'note-analysis',
    labelKey: 'quickActionNoteAnalysis',
    showInQuickAccess: true,
    showInPalette: true,
    requiresCourses: true,
  },
  {
    id: 'upload',
    labelKey: 'quickActionUpload',
    showInQuickAccess: true,
    showInPalette: true,
  },
  {
    id: 'workspace',
    labelKey: 'quickActionWorkspace',
    showInQuickAccess: true,
    showInPalette: true,
    requiresCourses: true,
  },
  {
    id: 'exam',
    labelKey: 'quickActionExam',
    showInQuickAccess: true,
    showInPalette: true,
    requiresCourses: true,
  },
];

export function quickAccessActions(hasCourses: boolean): GlobalQuickAction[] {
  return GLOBAL_QUICK_ACTIONS.filter(
    (a) => a.showInQuickAccess && (!a.requiresCourses || hasCourses),
  );
}

export function paletteQuickActions(hasCourses: boolean): GlobalQuickAction[] {
  return GLOBAL_QUICK_ACTIONS.filter(
    (a) => a.showInPalette && (!a.requiresCourses || hasCourses),
  );
}
