/**
 * Wave 6.8a — QA spine linking Reader heatmap ↔ lesson-step sync.
 */

import { buildReaderSegments } from './readerDocumentLayout';
import {
  buildReaderLearningHeatmap,
  type ReaderHeatmapLevel,
  type ReaderSegmentHeat,
} from './readerLearningHeatmap';
import type { ConceptBusState } from './workspaceConceptBus';
import type { WorkspaceStepRef } from './readerStepSync';
import {
  buildStepToSegmentMap,
  readerStepRoundTrip,
  resolveStepToReaderSegment,
} from './readerStepSyncBridge';

export type ReaderSyncIssue = {
  code: 'step-unmapped' | 'round-trip-mismatch' | 'heatmap-gap';
  stepIndex?: number;
  message: string;
};

export type ReaderStepHeatSyncSummary = {
  stepIndex: number;
  stepTitle: string;
  segmentIndex: number | null;
  segmentLabel: string | null;
  heatLevel: ReaderHeatmapLevel;
  heatScore: number;
  heatReasons: string[];
  synced: boolean;
};

export type ReaderHeatmapStepSyncReport = {
  ok: boolean;
  mappedStepCount: number;
  totalSteps: number;
  struggleSegmentCount: number;
  issues: ReaderSyncIssue[];
  steps: ReaderStepHeatSyncSummary[];
};

/** Build step → segment map using the shared bridge (single source of truth). */
export function buildStepToSegmentMapFromSource(
  steps: WorkspaceStepRef[],
  sourceText: string,
): Record<number, number> {
  const source = sourceText.trim();
  if (!source) return {};
  return buildStepToSegmentMap(steps, source);
}

export function auditReaderHeatmapStepSync(input: {
  steps: WorkspaceStepRef[];
  sourceText: string;
  conceptBus?: ConceptBusState | null;
  primaryConcept?: string;
  stepMarks?: Record<number, 'understood' | 'confusing'>;
  currentStep?: number;
}): ReaderHeatmapStepSyncReport {
  const source = input.sourceText.trim();
  const steps = input.steps;
  const issues: ReaderSyncIssue[] = [];

  if (!source || steps.length === 0) {
    return {
      ok: true,
      mappedStepCount: 0,
      totalSteps: steps.length,
      struggleSegmentCount: 0,
      issues: [],
      steps: [],
    };
  }

  const segments = buildReaderSegments(source);
  const stepToSegmentIndex = buildStepToSegmentMap(steps, source);
  const stepTitles = steps.map((s) => s.title);

  const heatmap = buildReaderLearningHeatmap({
    segments,
    conceptBus: input.conceptBus,
    primaryConcept: input.primaryConcept,
    stepMarks: input.stepMarks,
    stepTitles,
    stepToSegmentIndex,
  });

  const heatBySegment = new Map<number, ReaderSegmentHeat>();
  for (const row of heatmap) heatBySegment.set(row.segmentIndex, row);

  const struggleSegmentCount = heatmap.filter((h) => h.level === 'high' || h.level === 'medium').length;

  const stepSummaries: ReaderStepHeatSyncSummary[] = steps.map((step, stepIndex) => {
    const segmentIndex = stepToSegmentIndex[stepIndex] ?? null;
    const bridgeSeg = resolveStepToReaderSegment(stepIndex, steps, source);
    if (bridgeSeg != null && segmentIndex !== bridgeSeg) {
      issues.push({
        code: 'round-trip-mismatch',
        stepIndex,
        message: `Step ${stepIndex} segment map (${segmentIndex}) != bridge (${bridgeSeg})`,
      });
    }

    if (segmentIndex == null && !/quiz|κουίζ|upload|ανέβασμα/i.test(`${step.type} ${step.title}`)) {
      issues.push({
        code: 'step-unmapped',
        stepIndex,
        message: `Step "${step.title}" has no reader segment`,
      });
    }

    const roundTrip = readerStepRoundTrip(stepIndex, steps, source);
    if (roundTrip != null && roundTrip !== stepIndex) {
      issues.push({
        code: 'round-trip-mismatch',
        stepIndex,
        message: `Round-trip for step ${stepIndex} returned ${roundTrip}`,
      });
    }

    const heat = segmentIndex != null ? heatBySegment.get(segmentIndex) : undefined;
    const segmentLabel = segmentIndex != null
      ? segments[segmentIndex]?.content.split('\n')[0]?.trim().slice(0, 80) ?? null
      : null;

    return {
      stepIndex,
      stepTitle: step.title,
      segmentIndex,
      segmentLabel,
      heatLevel: heat?.level ?? 'none',
      heatScore: heat?.score ?? 0,
      heatReasons: heat?.reasons ?? [],
      synced: segmentIndex != null,
    };
  });

  if (input.stepMarks) {
    for (const [stepStr, mark] of Object.entries(input.stepMarks)) {
      if (mark !== 'confusing') continue;
      const stepIndex = Number(stepStr);
      const summary = stepSummaries[stepIndex];
      if (summary && summary.heatLevel === 'none') {
        issues.push({
          code: 'heatmap-gap',
          stepIndex,
          message: `Step marked confusing but heatmap shows no struggle at segment`,
        });
      }
    }
  }

  const mappedStepCount = stepSummaries.filter((s) => s.synced).length;
  const dedupedIssues = issues.filter(
    (issue, i, arr) => arr.findIndex((o) => o.code === issue.code && o.stepIndex === issue.stepIndex) === i,
  );

  return {
    ok: dedupedIssues.length === 0,
    mappedStepCount,
    totalSteps: steps.length,
    struggleSegmentCount,
    issues: dedupedIssues,
    steps: stepSummaries,
  };
}

export function activeStepHeatSyncSummary(
  report: ReaderHeatmapStepSyncReport,
  currentStep: number,
): ReaderStepHeatSyncSummary | null {
  return report.steps.find((s) => s.stepIndex === currentStep) ?? null;
}

export function stepHeatDotClass(level: ReaderHeatmapLevel): string {
  switch (level) {
    case 'high':
      return 'bg-accent-rose';
    case 'medium':
      return 'bg-accent-amber';
    case 'low':
      return 'bg-brand-400';
    default:
      return '';
  }
}
