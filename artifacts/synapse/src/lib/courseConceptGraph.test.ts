import { describe, expect, it } from 'vitest';
import type { ConceptGraph } from './conceptGraph';
import {
  attachConceptGraphToCourse,
  buildRelationExplainPrompt,
  conceptGraphToCourseVisual,
  findGraphRelation,
  mergeCourseGraphIntoConceptMap,
  summarizeCourseGraph,
} from './courseConceptGraph';
import type { ConceptMapEdge, ConceptMapNode } from './noteContentExtractors';

const sampleGraph: ConceptGraph = {
  valid: true,
  order: ['supply demand', 'elasticity'],
  nodes: [
    { id: 'n0', label: 'Supply & Demand', key: 'supply demand', salience: 1, tier: 1 },
    { id: 'n1', label: 'Elasticity', key: 'elasticity', salience: 0.8, tier: 2 },
  ],
  edges: [
    {
      id: 'e0',
      source: 'supply demand',
      target: 'elasticity',
      type: 'prerequisite',
      evidence: 'Elasticity measures responsiveness of demand.',
      weight: 0.9,
    },
  ],
};

describe('courseConceptGraph', () => {
  it('findGraphRelation returns typed edge between labels', () => {
    const rel = findGraphRelation(sampleGraph, 'Elasticity', 'Supply & Demand');
    expect(rel?.relationType).toBe('prerequisite');
    expect(rel?.sourceLabel).toBe('Supply & Demand');
    expect(rel?.targetLabel).toBe('Elasticity');
  });

  it('findGraphRelation resolves via related node when active label is not in graph', () => {
    const rel = findGraphRelation(sampleGraph, 'Microeconomics', 'Elasticity');
    expect(rel?.relationType).toBe('prerequisite');
    expect(rel?.targetLabel).toBe('Elasticity');
  });

  it('findGraphRelation fuzzy-matches glossary-style related labels', () => {
    const rel = findGraphRelation(sampleGraph, 'Supply & Demand', 'Price elasticity of demand');
    expect(rel?.relationType).toBe('prerequisite');
    expect(rel?.targetLabel).toBe('Elasticity');
  });

  it('buildRelationExplainPrompt includes evidence and relation type', () => {
    const rel = findGraphRelation(sampleGraph, 'Elasticity', 'Supply & Demand')!;
    const prompt = buildRelationExplainPrompt(rel, 'en');
    expect(prompt).toContain('Supply & Demand');
    expect(prompt).toContain('Elasticity');
    expect(prompt).toContain('prerequisite');
    expect(prompt).toContain('Elasticity measures responsiveness');
  });

  it('buildRelationExplainPrompt uses Greek copy when lang is el', () => {
    const rel = findGraphRelation(sampleGraph, 'Elasticity', 'Supply & Demand')!;
    const prompt = buildRelationExplainPrompt(rel, 'el');
    expect(prompt).toContain('Εξήγησε');
    expect(prompt).toContain('γράφημα γνώσης');
  });

  it('mergeCourseGraphIntoConceptMap adds graph nodes and edges', () => {
    const baseNodes: ConceptMapNode[] = [{
      id: 'n0', label: 'Supply & Demand', mastery: 80, type: 'concept', x: 0, y: 0,
    }];
    const baseEdges: ConceptMapEdge[] = [];
    const merged = mergeCourseGraphIntoConceptMap(baseNodes, baseEdges, sampleGraph);
    expect(merged.nodes.length).toBeGreaterThan(1);
    expect(merged.edges.some((e) => e.relation === 'prerequisite')).toBe(true);
  });

  it('conceptGraphToCourseVisual prefers persisted graph over topic prereqs', () => {
    const course = {
      id: 'c1',
      topics: [
        { id: 't1', title: 'Supply & Demand', mastery: 90, prerequisites: [], order: 1, isLocked: false },
        { id: 't2', title: 'Elasticity', mastery: 60, prerequisites: ['t1'], order: 2, isLocked: false },
      ],
      conceptGraph: sampleGraph,
    } as import('../types').Course;
    const visual = conceptGraphToCourseVisual(course);
    expect(visual.nodes.some((n) => n.label === 'Elasticity')).toBe(true);
    expect(visual.edges.length).toBe(1);
  });

  it('summarizeCourseGraph reports counts', () => {
    const summary = summarizeCourseGraph(sampleGraph);
    expect(summary.nodeCount).toBe(2);
    expect(summary.edgeCount).toBe(1);
    expect(summary.valid).toBe(true);
  });

  it('attachConceptGraphToCourse mines graph from source text', async () => {
    const text = [
      'To understand elasticity, you need to know supply and demand first.',
      'Supply and demand determine market equilibrium.',
      'Elasticity measures how quantity responds to price changes.',
    ].join(' ');
    const course = await attachConceptGraphToCourse(
      {
        id: 'c-test',
        title: 'Test',
        topics: [
          {
            id: 't1',
            title: 'Supply & Demand',
            description: '',
            lessons: [],
            mastery: 0,
            prerequisites: [],
            order: 1,
            isLocked: false,
            estimatedMinutes: 10,
            conceptCount: 1,
            retentionPrediction: 0,
            keyConcepts: ['Supply & Demand', 'Elasticity'],
          },
        ],
      } as unknown as import('../types').Course,
      text,
      ['Supply & Demand', 'Elasticity'],
    );
    expect(course.conceptGraph?.nodes.length).toBeGreaterThan(0);
  });
});
