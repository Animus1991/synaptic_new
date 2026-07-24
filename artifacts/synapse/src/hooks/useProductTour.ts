import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppView } from '../types';
import {
  PRODUCT_TOUR_STEPS,
  markProductTourComplete,
  isProductTourStepReady,
  type ProductTourStep,
} from '../lib/productTour';

export function useProductTour(opts: {
  open: boolean;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (opts.open && !wasOpen.current) {
      setStepIndex(0);
    }
    wasOpen.current = opts.open;
  }, [opts.open]);

  const step: ProductTourStep | null = opts.open ? PRODUCT_TOUR_STEPS[stepIndex] ?? null : null;

  useEffect(() => {
    if (!opts.open || !step?.navigateOnEnter) return;
    if (opts.currentView !== step.navigateOnEnter) {
      opts.onNavigate(step.navigateOnEnter);
    }
  }, [opts.open, stepIndex, step?.navigateOnEnter, opts.currentView, opts.onNavigate]);

  const complete = useCallback(() => {
    markProductTourComplete();
    opts.onClose();
  }, [opts.onClose]);

  const next = useCallback(() => {
    if (stepIndex >= PRODUCT_TOUR_STEPS.length - 1) {
      complete();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, complete]);

  const skip = complete;

  const ready = step ? isProductTourStepReady(step, opts.currentView) : false;

  return {
    step,
    stepIndex,
    totalSteps: PRODUCT_TOUR_STEPS.length,
    ready,
    next,
    skip,
  };
}
