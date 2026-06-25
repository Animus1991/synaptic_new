import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  auditLeitnerStaleArtifactUX,
  leitnerStaleBannerCopy,
  resolveLeitnerStaleBannerPlan,
  LEITNER_STALE_MIN_TOUCH_PX,
} from './leitnerStaleArtifactUX';
import { acknowledgeStaleTool, markCourseArtifactsStale } from './artifactStaleness';

describe('leitnerStaleArtifactUX', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    });
    acknowledgeStaleTool('leitner-course', 'leitner');
    acknowledgeStaleTool('leitner-course', 'quiz');
    acknowledgeStaleTool('leitner-course', 'simulator');
  });

  it('places sticky compact banner on mobile', () => {
    const plan = resolveLeitnerStaleBannerPlan(true);
    expect(plan.placement).toBe('deck-sticky');
    expect(plan.sticky).toBe(true);
    expect(plan.fullWidthDismiss).toBe(true);
    expect(plan.minTouchPx).toBe(LEITNER_STALE_MIN_TOUCH_PX);
  });

  it('places header banner on desktop', () => {
    const plan = resolveLeitnerStaleBannerPlan(false);
    expect(plan.placement).toBe('header');
    expect(plan.sticky).toBe(false);
  });

  it('provides bilingual copy for compact and full modes', () => {
    expect(leitnerStaleBannerCopy('en', true)).toContain('outdated');
    expect(leitnerStaleBannerCopy('el', false)).toContain('επανεπεξεργάστηκε');
  });

  it('flags missing mobile sticky banner when stale', () => {
    markCourseArtifactsStale('leitner-course', 'v2');
    const report = auditLeitnerStaleArtifactUX({
      courseId: 'leitner-course',
      isMobile: true,
      deckStickyBannerVisible: false,
    });
    expect(report.isStale).toBe(true);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === 'missing-sticky-mobile')).toBe(true);
  });

  it('passes when stale banners are surfaced correctly', () => {
    markCourseArtifactsStale('leitner-course', 'v3');
    const mobile = auditLeitnerStaleArtifactUX({
      courseId: 'leitner-course',
      isMobile: true,
      deckStickyBannerVisible: true,
      dismissTouchPx: 44,
    });
    expect(mobile.ok).toBe(true);

    const desktop = auditLeitnerStaleArtifactUX({
      courseId: 'leitner-course',
      isMobile: false,
      headerBannerVisible: true,
      dismissTouchPx: 44,
    });
    expect(desktop.ok).toBe(true);
  });
});
