/**
 * Study Room co-view — follow a leader's workspace viewport (tool + step + concept).
 * Not pixel screen-share; structured sync of Study Hub state inside a Study Room.
 */

export type CoViewViewport = {
  tool?: string;
  concept?: string;
  stepIndex?: number;
  leaderId?: string;
  leaderName?: string;
};

export type CoViewFollowAction = {
  tool?: string;
  concept?: string;
  stepIndex?: number;
};

/** Diff shared room viewport vs local state → what the follower should apply. */
export function coViewFollowActions(
  shared: CoViewViewport,
  local: { tool?: string; concept?: string; stepIndex?: number },
  opts?: { followTool?: boolean; followStep?: boolean; followConcept?: boolean },
): CoViewFollowAction {
  const followTool = opts?.followTool !== false;
  const followStep = opts?.followStep !== false;
  const followConcept = opts?.followConcept !== false;
  const next: CoViewFollowAction = {};
  if (followTool && shared.tool && shared.tool !== local.tool) next.tool = shared.tool;
  if (
    followStep
    && typeof shared.stepIndex === 'number'
    && Number.isFinite(shared.stepIndex)
    && shared.stepIndex !== local.stepIndex
  ) {
    next.stepIndex = Math.max(0, Math.floor(shared.stepIndex));
  }
  if (followConcept && shared.concept && shared.concept !== local.concept) {
    next.concept = shared.concept;
  }
  return next;
}

export function coViewActionKey(action: CoViewFollowAction): string {
  return [action.tool ?? '', action.stepIndex ?? '', action.concept ?? ''].join('|');
}

export function hasCoViewAction(action: CoViewFollowAction): boolean {
  return Boolean(action.tool || action.concept || typeof action.stepIndex === 'number');
}

export function describeCoViewStatus(
  lang: 'en' | 'el',
  mode: 'leading' | 'following' | 'solo',
  viewport: CoViewViewport,
): string {
  if (mode === 'solo') {
    return lang === 'el'
      ? 'Study Room ανοιχτό — ενεργοποίησε co-view για να μοιραστείς το Study Hub.'
      : 'Study Room open — turn on co-view to share the Study Hub viewport.';
  }
  const where = [
    viewport.tool,
    typeof viewport.stepIndex === 'number' ? `§${viewport.stepIndex + 1}` : null,
    viewport.concept,
  ].filter(Boolean).join(' · ');
  if (mode === 'leading') {
    return lang === 'el'
      ? `Οδηγείς co-view${where ? `: ${where}` : ''}. Οι άλλοι ακολουθούν το Study Hub σου.`
      : `Leading co-view${where ? `: ${where}` : ''}. Peers follow your Study Hub.`;
  }
  const who = viewport.leaderName || (lang === 'el' ? 'οδηγό' : 'leader');
  return lang === 'el'
    ? `Ακολουθείς ${who}${where ? ` · ${where}` : ''}`
    : `Following ${who}${where ? ` · ${where}` : ''}`;
}
