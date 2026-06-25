/**
 * SW-P1-03 — Fixed lesson-step actions on LessonStepToolBar.
 */

import type { Lang } from './i18n';
import type { NextActionRecommendation } from './nextActionEngine';
import { getLearningActions, type LearningActionId } from './workspaceLearningActions';

/** Always-visible row: Study · Test · Explain · Ask Agent */
export const LESSON_STEP_UNIFIED_ACTIONS: LearningActionId[] = [
  'study-section',
  'test-me',
  'explain-zero',
  'ask-agent',
];

export type LessonStepUnifiedAction = {
  id: LearningActionId;
  label: string;
  hint: string;
  recommended: boolean;
};

export function buildLessonStepUnifiedActions(
  lang: Lang,
  nextAction?: NextActionRecommendation | null,
): LessonStepUnifiedAction[] {
  const table = getLearningActions(lang);
  const primary = nextAction?.primary;
  const recommendedId =
    primary && LESSON_STEP_UNIFIED_ACTIONS.includes(primary as LearningActionId)
      ? (primary as LearningActionId)
      : null;

  return LESSON_STEP_UNIFIED_ACTIONS.map((id) => {
    const def = table.find((a) => a.id === id)!;
    return {
      id,
      label: def.label,
      hint: def.hint,
      recommended: id === recommendedId,
    };
  });
}
