/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { AppView } from '../types';
import { PRODUCT_TOUR_STEPS } from '../lib/productTour';
import { useProductTour } from './useProductTour';

/** Index of the first step that pins the tour to a view on entry. */
const navStepIndex = PRODUCT_TOUR_STEPS.findIndex((s) => s.navigateOnEnter);

function setup(initialView: AppView, open = true) {
  const onNavigate = vi.fn();
  const onClose = vi.fn();
  const { result, rerender } = renderHook(
    ({ currentView }: { currentView: AppView }) =>
      useProductTour({ open, currentView, onNavigate, onClose }),
    { initialProps: { currentView: initialView } },
  );
  return { onNavigate, onClose, result, rerender };
}

describe('useProductTour', () => {
  it('navigates to the step view once when the step is entered', () => {
    const step = PRODUCT_TOUR_STEPS[navStepIndex];
    const target = step.navigateOnEnter!;
    const other: AppView = target === 'dashboard' ? 'analytics' : 'dashboard';

    const { onNavigate, result, rerender } = setup(other);
    // Advance to the first step that declares navigateOnEnter.
    for (let i = 0; i < navStepIndex; i += 1) result.current.next();
    rerender({ currentView: other });

    expect(onNavigate).toHaveBeenCalledWith(target);
  });

  it('does not re-pin the view when the user navigates away mid-step', () => {
    const step = PRODUCT_TOUR_STEPS[navStepIndex];
    const target = step.navigateOnEnter!;
    const other: AppView = target === 'dashboard' ? 'analytics' : 'dashboard';

    const { onNavigate, result, rerender } = setup(target);
    for (let i = 0; i < navStepIndex; i += 1) result.current.next();
    rerender({ currentView: target });
    onNavigate.mockClear();

    // User leaves the tour's view on purpose — the tour must not yank them back.
    rerender({ currentView: other });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('reports ready only while the current view matches the step view', () => {
    const { result, rerender } = setup('dashboard');
    expect(result.current.ready).toBe(true);
    rerender({ currentView: 'analytics' });
    expect(result.current.ready).toBe(false);
  });
});
