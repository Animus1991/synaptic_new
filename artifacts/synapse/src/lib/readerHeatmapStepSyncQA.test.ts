import { describe, expect, it } from 'vitest';
import {
  auditReaderHeatmapStepSync,
  activeStepHeatSyncSummary,
  stepHeatDotClass,
} from './readerHeatmapStepSyncQA';
import { recordConceptActivity } from './workspaceConceptBus';
import { buildStepToSegmentMap } from './readerStepSyncBridge';

const syllabus = `# Supply and Demand

Market equilibrium clears when supply meets demand.

# Elasticity

Price elasticity measures responsiveness.`;

const steps = [
  { title: 'Introduction', type: 'Intro' },
  { title: 'Supply and Demand', type: 'Section' },
  { title: 'Elasticity', type: 'Section' },
];

describe('readerHeatmapStepSyncQA', () => {
  it('maps steps to reader segments via shared bridge', () => {
    const map = buildStepToSegmentMap(steps, syllabus);
    expect(map[1]).toBeDefined();
    expect(map[2]).toBeDefined();
  });

  it('reports heat on confusing steps linked to headings', () => {
    const report = auditReaderHeatmapStepSync({
      steps,
      sourceText: syllabus,
      stepMarks: { 2: 'confusing' },
      currentStep: 2,
    });

    expect(report.mappedStepCount).toBeGreaterThanOrEqual(2);
    const active = activeStepHeatSyncSummary(report, 2);
    expect(active?.heatLevel).not.toBe('none');
    expect(active?.synced).toBe(true);
  });

  it('surfaces concept bus struggle on synced segments', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Elasticity', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Elasticity', 'quiz', 'quiz-wrong');

    const report = auditReaderHeatmapStepSync({
      steps,
      sourceText: syllabus,
      conceptBus: bus,
      primaryConcept: 'Elasticity',
    });

    const elasticity = report.steps.find((s) => s.stepTitle === 'Elasticity');
    expect(elasticity?.heatLevel).not.toBe('none');
    expect(report.struggleSegmentCount).toBeGreaterThan(0);
  });

  it('exports heat dot classes for lesson rail', () => {
    expect(stepHeatDotClass('high')).toContain('rose');
    expect(stepHeatDotClass('none')).toBe('');
  });
});
