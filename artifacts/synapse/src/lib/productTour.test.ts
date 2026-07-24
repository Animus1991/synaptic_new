/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  PRODUCT_TOUR_STEPS,
  clearProductTourComplete,
  getProductTourStep,
  isProductTourComplete,
  isProductTourStepReady,
  markProductTourComplete,
} from './productTour';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  });
}

describe('productTour', () => {
  beforeEach(() => {
    installLocalStorageMock();
    clearProductTourComplete();
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
