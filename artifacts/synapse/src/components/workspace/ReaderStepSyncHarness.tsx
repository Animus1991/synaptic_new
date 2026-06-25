/**
 * Minimal DOM harness mirroring StudyWorkspace Reader ↔ step sync wiring.
 */

import { useState, useEffect, useRef } from 'react';
import { buildReaderSegments } from '../../lib/readerDocumentLayout';
import { buildReaderSectionNavFromSegments } from '../../lib/readerSectionNav';
import {
  resolveReaderNavToStep,
  resolveStepToReaderSegment,
  shouldFocusReaderOnStepSelect,
  isReaderNavNoop,
  resolveStepAfterReprocess,
} from '../../lib/readerStepSyncBridge';
import type { WorkspaceStepRef } from '../../lib/readerStepSync';

type Props = {
  steps: WorkspaceStepRef[];
  sourceText: string;
};

export function ReaderStepSyncHarness({ steps, sourceText }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [focusReader, setFocusReader] = useState(true);
  const prevStepCountRef = useRef(steps.length);
  const segments = buildReaderSegments(sourceText);
  const navItems = buildReaderSectionNavFromSegments(segments);
  const activeSegment = resolveStepToReaderSegment(stepIndex, steps, sourceText);

  const selectStep = (i: number, opts?: { focusReader?: boolean }) => {
    setStepIndex(i);
    const step = steps[i];
    const shouldFocus = Boolean(
      opts?.focusReader && step && shouldFocusReaderOnStepSelect(step, true),
    );
    setFocusReader(shouldFocus);
  };

  const onSectionNav = (label: string) => {
    if (isReaderNavNoop(stepIndex, label, steps, sourceText)) return;
    const action = resolveReaderNavToStep(label, steps, sourceText);
    if (action.type === 'select-step') selectStep(action.stepIndex, { focusReader: true });
  };

  useEffect(() => {
    if (steps.length === 0) return;
    if (stepIndex >= steps.length) {
      setStepIndex(
        resolveStepAfterReprocess(stepIndex, steps.length, prevStepCountRef.current || steps.length),
      );
    }
    prevStepCountRef.current = steps.length;
  }, [steps.length, stepIndex]);

  return (
    <div data-testid="reader-step-sync-harness">
      <div data-testid="harness-active-step">{stepIndex}</div>
      <div data-testid="harness-active-segment">{activeSegment ?? 'none'}</div>
      <div data-testid="harness-focus-reader">{focusReader ? 'yes' : 'no'}</div>
      <div data-testid="reader-section-nav">
        {navItems.map((item) => {
          const isActive = item.segmentIndex === activeSegment;
          return (
            <button
              key={item.segmentIndex}
              type="button"
              data-testid={isActive ? `reader-section-nav-active-${item.segmentIndex}` : `reader-section-nav-${item.segmentIndex}`}
              onClick={() => onSectionNav(item.label)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {steps.map((s, i) => (
        <button
          key={i}
          type="button"
          data-testid={`workspace-step-rail-${i}`}
          aria-current={stepIndex === i ? 'step' : undefined}
          onClick={() => selectStep(i, { focusReader: true })}
        >
          {s.title}
        </button>
      ))}
      <button
        type="button"
        data-testid="harness-unknown-nav"
        onClick={() => onSectionNav('Άγνωστη ενότητα')}
      >
        Unknown section
      </button>
    </div>
  );
}
