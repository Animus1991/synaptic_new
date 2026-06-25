import { describe, expect, it } from 'vitest';
import { buildReaderLearningHeatmap } from './readerLearningHeatmap';
import { recordConceptActivity } from './workspaceConceptBus';
import type { ReaderSegment } from './readerDocumentLayout';

const segments: ReaderSegment[] = [
  { kind: 'heading', content: 'Supply and Demand', charStart: 0, charEnd: 19 },
  { kind: 'paragraph', content: 'Equilibrium price clears the market when supply meets demand.', charStart: 20, charEnd: 82 },
  { kind: 'heading', content: 'Elasticity', charStart: 83, charEnd: 93 },
  { kind: 'paragraph', content: 'Price elasticity measures responsiveness.', charStart: 94, charEnd: 135 },
];

describe('buildReaderLearningHeatmap', () => {
  it('highlights segments tied to struggling concepts on the bus', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Supply and Demand', 'quiz', 'quiz-wrong');
    bus = recordConceptActivity(bus, 'Supply and Demand', 'quiz', 'quiz-wrong');

    const heat = buildReaderLearningHeatmap({
      segments,
      conceptBus: bus,
      primaryConcept: 'Supply and Demand',
    });

    expect(heat[0]?.level).not.toBe('none');
    expect(heat[1]?.level).not.toBe('none');
  });

  it('marks confusing lesson steps on matching headings', () => {
    const heat = buildReaderLearningHeatmap({
      segments,
      conceptBus: {},
      stepMarks: { 1: 'confusing' },
      stepTitles: ['Intro', 'Elasticity'],
      stepToSegmentIndex: { 1: 2 },
    });

    expect(heat[2]?.level).toBe('high');
  });
});
