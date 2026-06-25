import { describe, expect, it } from 'vitest';
import {
  applyReaderSectionNav,
  applyWorkspaceStepSelect,
  buildStepReaderSyncView,
  buildStepToSegmentMap,
  readerStepRoundTrip,
  resolveReaderNavToStep,
  resolveStepToReaderSegment,
  resolveSyncAfterReprocess,
  shouldFocusReaderOnStepSelect,
  clampWorkspaceStepIndex,
  resolveStepAfterReprocess,
  isReaderNavNoop,
} from './readerStepSyncBridge';

const syllabusText = [
  'ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ',
  'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ',
  'Θεματική: εμπορική πολιτική.',
].join('\f') + '\f' + [
  'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ',
  'Απόλυτα πλεονεκτήματα.',
].join('\n');

const steps = [
  { title: 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ', type: 'Core Concept' },
  { title: 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ', type: 'Deep Dive' },
  { title: 'Knowledge Check', type: 'Quiz' },
];

describe('readerStepSyncBridge (Prompt 16 — component-level integration)', () => {
  describe('1. Reader-to-step round-trip', () => {
    it('maps reader section nav label to step selection with focusReader', () => {
      const action = resolveReaderNavToStep('ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ', steps, syllabusText);
      expect(action).toEqual({ type: 'select-step', stepIndex: 1, focusReader: true });
    });

    it('round-trips lesson step through reader segment label', () => {
      expect(readerStepRoundTrip(0, steps, syllabusText)).toBe(0);
      expect(readerStepRoundTrip(1, steps, syllabusText)).toBe(1);
      expect(readerStepRoundTrip(2, steps, syllabusText)).toBeNull();
    });
  });

  describe('2. Step-to-Reader round-trip', () => {
    it('resolves workspace step to reader segment index', () => {
      const seg0 = resolveStepToReaderSegment(0, steps, syllabusText);
      const seg1 = resolveStepToReaderSegment(1, steps, syllabusText);
      expect(seg0).not.toBeNull();
      expect(seg1).not.toBeNull();
      expect(seg0).not.toBe(seg1);
    });

    it('applyWorkspaceStepSelect exposes segment index for lesson steps', () => {
      const result = applyWorkspaceStepSelect(1, steps, syllabusText, true, { focusReader: true });
      expect(result.readerSegmentIndex).toBe(resolveStepToReaderSegment(1, steps, syllabusText));
      expect(result.focusReader).toBe(true);
    });
  });

  describe('3. Quiz no-focus behavior', () => {
    it('does not focus reader on quiz steps', () => {
      expect(shouldFocusReaderOnStepSelect(steps[2]!, true)).toBe(false);
      expect(shouldFocusReaderOnStepSelect(steps[0]!, true)).toBe(true);
    });

    it('applyWorkspaceStepSelect keeps focusReader false for quiz even when requested', () => {
      const quiz = applyWorkspaceStepSelect(2, steps, syllabusText, true, { focusReader: true });
      expect(quiz.focusReader).toBe(false);
      expect(quiz.readerSegmentIndex).toBeNull();
    });
  });

  describe('4. Noop behavior', () => {
    it('returns noop for empty source or unknown label', () => {
      expect(resolveReaderNavToStep('ΔΙΑΛΕΞΗ 2', steps, '')).toEqual({ type: 'noop' });
      expect(resolveReaderNavToStep('Άγνωστη ενότητα', steps, syllabusText)).toEqual({ type: 'noop' });
    });

    it('isReaderNavNoop avoids redundant step updates', () => {
      expect(isReaderNavNoop(1, 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ', steps, syllabusText)).toBe(true);
      expect(isReaderNavNoop(0, 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ', steps, syllabusText)).toBe(false);
    });

    it('applyReaderSectionNav mirrors StudyWorkspace noop guard', () => {
      expect(applyReaderSectionNav(1, 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ', steps, syllabusText)).toEqual({ type: 'noop' });
      expect(applyReaderSectionNav(0, 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ', steps, syllabusText)).toEqual({
        type: 'select-step',
        stepIndex: 1,
        focusReader: true,
      });
    });
  });

  describe('5. Missing step fallback', () => {
    it('clampWorkspaceStepIndex handles invalid step ids', () => {
      expect(clampWorkspaceStepIndex(-1, 5)).toBe(0);
      expect(clampWorkspaceStepIndex(10, 5)).toBe(4);
      expect(clampWorkspaceStepIndex(2, 0)).toBe(0);
    });

    it('buildStepReaderSyncView returns no focus for out-of-range step', () => {
      const view = buildStepReaderSyncView(99, steps, syllabusText, true);
      expect(view.readerSegmentIndex).toBeNull();
      expect(view.focusReader).toBe(false);
    });
  });

  describe('6. Reprocess version mismatch', () => {
    it('resolveStepAfterReprocess maps stale index after step count shrink', () => {
      expect(resolveStepAfterReprocess(8, 3, 9)).toBe(2);
      expect(resolveStepAfterReprocess(2, 5, 5)).toBe(2);
    });

    it('resolveSyncAfterReprocess rebuilds reader view on reshaped outline', () => {
      const shrunkSteps = steps.slice(0, 2);
      const sync = resolveSyncAfterReprocess(8, steps.length, shrunkSteps, syllabusText);
      expect(sync.stepIndex).toBe(1);
      expect(sync.readerSegmentIndex).not.toBeNull();
      expect(sync.focusReader).toBe(true);
    });

    it('resolveSyncAfterReprocess handles generic step when source sections removed', () => {
      const genericSteps = [{ title: 'Introduction', type: 'Core Concept' }];
      const sync = resolveSyncAfterReprocess(5, 9, genericSteps, 'Unrelated plain text without lecture headings.');
      expect(sync.stepIndex).toBe(0);
      expect(sync.readerSegmentIndex).toBeNull();
      expect(sync.focusReader).toBe(true);
    });
  });

  it('buildStepToSegmentMap indexes all mappable steps', () => {
    const map = buildStepToSegmentMap(steps, syllabusText);
    expect(map[0]).toBeDefined();
    expect(map[1]).toBeDefined();
  });
});
