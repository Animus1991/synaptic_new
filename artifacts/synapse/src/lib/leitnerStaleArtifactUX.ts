/**
 * Wave 6.8d — Leitner stale-artifact banner layout policy + mobile UX QA.
 */

import { isToolArtifactStale } from './artifactStaleness';

export const LEITNER_STALE_MIN_TOUCH_PX = 44;
export const LEITNER_MOBILE_BREAKPOINT_PX = 640;

export type LeitnerStaleBannerPlacement = 'header' | 'deck-sticky';

export type LeitnerStaleBannerPlan = {
  placement: LeitnerStaleBannerPlacement;
  compact: boolean;
  minTouchPx: number;
  sticky: boolean;
  fullWidthDismiss: boolean;
};

export type LeitnerStaleArtifactIssue = {
  code: 'touch-target-small' | 'missing-sticky-mobile' | 'missing-header-desktop' | 'stale-not-surfaced';
  message: string;
};

export type LeitnerStaleArtifactReport = {
  ok: boolean;
  isStale: boolean;
  mobilePlan: LeitnerStaleBannerPlan;
  desktopPlan: LeitnerStaleBannerPlan;
  issues: LeitnerStaleArtifactIssue[];
};

export function resolveLeitnerStaleBannerPlan(isMobile: boolean): LeitnerStaleBannerPlan {
  if (isMobile) {
    return {
      placement: 'deck-sticky',
      compact: true,
      minTouchPx: LEITNER_STALE_MIN_TOUCH_PX,
      sticky: true,
      fullWidthDismiss: true,
    };
  }
  return {
    placement: 'header',
    compact: false,
    minTouchPx: LEITNER_STALE_MIN_TOUCH_PX,
    sticky: false,
    fullWidthDismiss: false,
  };
}

export function leitnerStaleBannerCopy(lang: 'en' | 'el', compact: boolean): string {
  if (lang === 'el') {
    return compact
      ? 'Οι κάρτες μπορεί να βασίζονται σε παλιό υλικό μετά το Reprocess.'
      : 'Η πηγή επανεπεξεργάστηκε — οι κάρτες (συμπεριλαμβανομένων custom) μπορεί να βασίζονται σε παλιό υλικό.';
  }
  return compact
    ? 'Cards may be outdated after reprocess.'
    : 'Source was reprocessed — flashcards (including custom cards) may be based on outdated material.';
}

/** Audit stale surfacing + mobile/desktop banner parity for Leitner. */
export function auditLeitnerStaleArtifactUX(input: {
  courseId?: string;
  isMobile?: boolean;
  headerBannerVisible?: boolean;
  deckStickyBannerVisible?: boolean;
  dismissTouchPx?: number;
}): LeitnerStaleArtifactReport {
  const isStale = isToolArtifactStale(input.courseId, 'leitner');
  const isMobile = input.isMobile ?? false;
  const issues: LeitnerStaleArtifactIssue[] = [];
  const mobilePlan = resolveLeitnerStaleBannerPlan(true);
  const desktopPlan = resolveLeitnerStaleBannerPlan(false);
  const touchPx = input.dismissTouchPx ?? LEITNER_STALE_MIN_TOUCH_PX;

  if (touchPx < LEITNER_STALE_MIN_TOUCH_PX) {
    issues.push({
      code: 'touch-target-small',
      message: `Dismiss control ${touchPx}px is below ${LEITNER_STALE_MIN_TOUCH_PX}px minimum`,
    });
  }

  if (isStale) {
    if (isMobile && !input.deckStickyBannerVisible) {
      issues.push({
        code: 'missing-sticky-mobile',
        message: 'Mobile deck sticky stale banner must be visible while reviewing cards',
      });
    }
    if (!isMobile && !input.headerBannerVisible) {
      issues.push({
        code: 'missing-header-desktop',
        message: 'Desktop header stale banner must be visible',
      });
    }
    if (!input.headerBannerVisible && !input.deckStickyBannerVisible) {
      issues.push({
        code: 'stale-not-surfaced',
        message: 'Stale leitner artifacts are not surfaced to the learner',
      });
    }
  }

  return {
    ok: issues.length === 0,
    isStale,
    mobilePlan,
    desktopPlan: isMobile ? desktopPlan : resolveLeitnerStaleBannerPlan(false),
    issues,
  };
}
