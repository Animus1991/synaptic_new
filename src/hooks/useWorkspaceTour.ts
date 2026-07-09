import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WORKSPACE_TOUR_STEPS,
  markWorkspaceTourComplete,
  type WorkspaceTourStep,
} from '../lib/workspaceTour';

export function useWorkspaceTour(opts: { open: boolean; onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (opts.open && !wasOpen.current) {
      setStepIndex(0);
    }
    wasOpen.current = opts.open;
  }, [opts.open]);

  const step: WorkspaceTourStep | null = opts.open ? WORKSPACE_TOUR_STEPS[stepIndex] ?? null : null;

  const complete = useCallback(() => {
    markWorkspaceTourComplete();
    opts.onClose();
  }, [opts.onClose]);

  const next = useCallback(() => {
    if (stepIndex >= WORKSPACE_TOUR_STEPS.length - 1) {
      complete();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, complete]);

  const skip = complete;

  return {
    step: step
      ? { ...step, titleKey: step.titleKey, bodyKey: step.bodyKey }
      : null,
    stepIndex,
    totalSteps: WORKSPACE_TOUR_STEPS.length,
    ready: Boolean(step),
    next,
    skip,
  };
}
