import { describe, expect, it } from 'vitest';
import { resolveConceptMapLayoutPlan, conceptMapLargeGraphMessage } from './conceptMapLayoutPolicy';
import {
  conceptMapSelectionMatchesLens,
  lensHighlightsMapNode,
} from './conceptMapLensBridge';
import type { ConceptLensView } from './conceptGraphModel';

const sampleLens: ConceptLensView = {
  activeConcept: 'Elasticity',
  mastery: 40,
  engagement: 2,
  struggling: true,
  confident: false,
  sourceSections: [],
  readerStepIndex: 1,
  prerequisites: [{ label: 'Supply', relation: 'prerequisite' }],
  related: [{ label: 'Demand', relation: 'related' }],
  followUp: [],
  contrasted: [],
  weakConcepts: [],
  toolHits: [],
  suggestedActions: ['quiz'],
  hasGraph: true,
};

describe('conceptMapLayoutPolicy', () => {
  it('reduces iterations for large graphs', () => {
    const small = resolveConceptMapLayoutPlan(12);
    const large = resolveConceptMapLayoutPlan(60);
    expect(large.iterations).toBeLessThan(small.iterations);
    expect(large.warnLargeGraph).toBe(true);
    expect(conceptMapLargeGraphMessage(60, 'en')).toMatch(/60 concepts/);
  });
});

describe('conceptMapLensBridge', () => {
  it('matches map selection to lens focus', () => {
    expect(conceptMapSelectionMatchesLens('Elasticity', sampleLens)).toBe(true);
    expect(conceptMapSelectionMatchesLens('Supply', sampleLens)).toBe(false);
  });

  it('highlights prerequisite nodes from lens', () => {
    expect(lensHighlightsMapNode('Supply', sampleLens)).toBe(true);
    expect(lensHighlightsMapNode('Unrelated', sampleLens)).toBe(false);
  });
});
