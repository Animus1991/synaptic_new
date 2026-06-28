import { describe, expect, it, beforeEach } from 'vitest';
import {
  PRODUCT_TOUR_STEPS,
  clearProductTourComplete,
  getProductTourStep,
  isProductTourComplete,
  isProductTourStepReady,
  markProductTourComplete,
} from './productTour';

describe('productTour', () => {
  beforeEach(() => {
    try {
      clearProductTourComplete();
    } catch {
      /* node env */
    }
  });

  it('starts incomplete and persists completion', () => {
    expect(isProductTourComplete()).toBe(false);
    markProductTourComplete();
    expect(isProductTourComplete()).toBe(true);
  });

  it('defines upload → workspace discoverability steps', () => {
    expect(PRODUCT_TOUR_STEPS.map((s) => s.id)).toEqual([
      'welcome',
      'library-nav',
      'library-upload',
      'workspace-cta',
      'done',
    ]);
    expect(PRODUCT_TOUR_STEPS.find((s) => s.id === 'library-upload')?.navigateOnEnter).toBe('library');
    expect(PRODUCT_TOUR_STEPS.find((s) => s.id === 'workspace-cta')?.target).toEqual([
      'dashboard-workspace-cta',
      'dashboard-upload',
    ]);
  });

  it('waits for the expected view before highlighting', () => {
    const uploadStep = getProductTourStep(2)!;
    expect(isProductTourStepReady(uploadStep, 'dashboard')).toBe(false);
    expect(isProductTourStepReady(uploadStep, 'library')).toBe(true);
  });
});
