/**
 * Wave 7 / SW-P1-04 — Reader ↔ lesson-rail bidirectional sync QA spine.
 */

import type { Lang } from './i18n';
import type { WorkspaceStepRef } from './readerStepSync';
import {
  applyReaderSectionNav,
  applyWorkspaceStepSelect,
  buildStepToSegmentMap,
  readerStepRoundTrip,
  resolveReaderNavToStep,
} from './readerStepSyncBridge';
import { buildReaderSegments } from './readerDocumentLayout';

export type ReaderStepSyncP104Issue = {
  code: 'no-source' | 'reader-nav-gap' | 'step-rail-gap' | 'round-trip-gap';
  message: string;
};

export type ReaderStepSyncP104Report = {
  ok: boolean;
  stepCount: number;
  linkedStepCount: number;
  readerSectionCount: number;
  readerNavResolvable: number;
  roundTripOk: number;
  issues: ReaderStepSyncP104Issue[];
  bannerSummary: string | null;
};

export function auditReaderStepSyncP104(input: {
  lang: Lang;
  steps: WorkspaceStepRef[];
  sourceText: string;
  currentStep?: number;
}): ReaderStepSyncP104Report {
  const issues: ReaderStepSyncP104Issue[] = [];
  const source = input.sourceText.trim();
  const { steps } = input;

  if (!source) {
    issues.push({
      code: 'no-source',
      message: 'Reader ↔ step sync requires analyzed source text.',
    });
    return {
      ok: false,
      stepCount: steps.length,
      linkedStepCount: 0,
      readerSectionCount: 0,
      readerNavResolvable: 0,
      roundTripOk: 0,
      issues,
      bannerSummary: null,
    };
  }

  const segments = buildReaderSegments(source);
  const stepToSegment = buildStepToSegmentMap(steps, source);
  const linkedStepCount = Object.keys(stepToSegment).length;

  const sectionLabels = segments
    .filter((s) => s.kind === 'heading')
    .map((s) => s.content)
    .filter(Boolean);

  let readerNavResolvable = 0;
  for (const label of sectionLabels) {
    const action = resolveReaderNavToStep(label, steps, source);
    if (action.type === 'select-step') readerNavResolvable += 1;
  }

  let roundTripOk = 0;
  for (let i = 0; i < steps.length; i += 1) {
    if (readerStepRoundTrip(i, steps, source) === i) roundTripOk += 1;
  }

  const currentStep = input.currentStep ?? 0;
  const readerNav = applyReaderSectionNav(
    currentStep,
    sectionLabels[0] ?? '',
    steps,
    source,
  );
  const stepSelect = applyWorkspaceStepSelect(currentStep, steps, source, true, {
    focusReader: true,
  });

  if (linkedStepCount === 0) {
    issues.push({
      code: 'step-rail-gap',
      message: 'No lesson steps map to Reader heading segments.',
    });
  }
  if (sectionLabels.length > 0 && readerNavResolvable === 0) {
    issues.push({
      code: 'reader-nav-gap',
      message: 'Reader section nav does not resolve to any workspace step.',
    });
  }
  if (roundTripOk < linkedStepCount) {
    issues.push({
      code: 'round-trip-gap',
      message: 'Step ↔ Reader round-trip parity is incomplete.',
    });
  }
  if (readerNav.type === 'noop' && sectionLabels.length > 0 && readerNavResolvable > 0) {
    issues.push({
      code: 'reader-nav-gap',
      message: 'Primary reader section failed noop guard / nav apply.',
    });
  }
  if (stepSelect.readerSegmentIndex == null && linkedStepCount > 0) {
    issues.push({
      code: 'step-rail-gap',
      message: 'Active step does not scroll Reader to a segment.',
    });
  }

  const isEl = input.lang === 'el';
  const ok = issues.length === 0;
  const bannerSummary = ok
    ? (isEl
      ? `Συγχρονισμός Reader ↔ βήματα · ${linkedStepCount}/${steps.length} βήματα`
      : `Reader ↔ step sync · ${linkedStepCount}/${steps.length} steps linked`)
    : (isEl
      ? 'Συγχρονισμός Reader ↔ βήματα — χρειάζεται έλεγχος'
      : 'Reader ↔ step sync — needs attention');

  return {
    ok,
    stepCount: steps.length,
    linkedStepCount,
    readerSectionCount: sectionLabels.length,
    readerNavResolvable,
    roundTripOk,
    issues,
    bannerSummary,
  };
}
