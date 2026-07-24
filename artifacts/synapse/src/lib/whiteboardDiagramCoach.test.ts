import { describe, expect, it } from 'vitest';
import {
  buildDiagramCoachPlan,
  buildWhiteboardDiagramAgentPrompt,
  describeWhiteboardDocument,
  inferDiagramBlueprintKind,
  layoutCoachNodePositions,
} from './whiteboardDiagramCoach';
import { migrateWhiteboardPayload } from './whiteboardLayers';

describe('whiteboardDiagramCoach', () => {
  it('infers formula-web when multiple formulas exist', () => {
    expect(inferDiagramBlueprintKind({ formulaCount: 3, relatedCount: 0 })).toBe('formula-web');
  });

  it('infers concept-map for rich related context', () => {
    expect(inferDiagramBlueprintKind({ formulaCount: 0, relatedCount: 4 })).toBe('concept-map');
  });

  it('builds coach plan with steps and node labels', () => {
    const plan = buildDiagramCoachPlan({
      concept: 'Tariffs',
      lang: 'en',
      sectionLabel: 'Trade policy',
      referenceExcerpt: 'Import tariffs raise domestic prices and reduce consumer surplus.',
      relatedConcepts: ['Quota', 'Welfare', 'Deadweight loss'],
      formulas: [{ id: 'f1', name: 'Consumer surplus', formula: 'CS = \\int' }],
    });
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    expect(plan.nodeLabels.length).toBeGreaterThan(0);
    expect(plan.title).toContain('Trade policy');
  });

  it('builds agent guide prompt with steps', () => {
    const plan = buildDiagramCoachPlan({
      concept: 'Elasticity',
      lang: 'en',
      relatedConcepts: ['Demand', 'Supply'],
    });
    const prompt = buildWhiteboardDiagramAgentPrompt(plan, 'en', 'guide');
    expect(prompt).toContain('Elasticity');
    expect(prompt).toContain('step');
  });

  it('layouts node positions in a grid', () => {
    const pos = layoutCoachNodePositions(4);
    expect(pos).toHaveLength(4);
    expect(pos[1]!.x).toBeGreaterThan(pos[0]!.x);
  });

  it('describes canvas strokes for agent explain', () => {
    const doc = migrateWhiteboardPayload([], 'en');
    doc.strokes.push({
      layerId: doc.activeLayerId,
      tool: 'text',
      color: '#67e8f9',
      width: 2,
      points: [{ x: 56, y: 72 }],
      text: 'Supply',
    });
    doc.strokes.push({
      layerId: doc.activeLayerId,
      tool: 'arrow',
      color: '#a78bfa',
      width: 2,
      points: [{ x: 100, y: 120 }, { x: 200, y: 80 }],
    });
    const description = describeWhiteboardDocument(doc, 'en');
    expect(description).toContain('Supply');
    expect(description).toContain('arrow');
  });

  it('builds explain prompt from sketch description', () => {
    const plan = buildDiagramCoachPlan({
      concept: 'Elasticity',
      lang: 'en',
      relatedConcepts: ['Demand'],
    });
    const prompt = buildWhiteboardDiagramAgentPrompt(plan, 'en', 'explain', {
      sketchDescription: '[Main] text "Demand" @ (40,60)\n[Main] arrow (100,120) → (200,80)',
      referenceExcerpt: 'Price elasticity measures responsiveness.',
    });
    expect(prompt).toContain('Explain my diagram');
    expect(prompt).toContain('Demand');
    expect(prompt).toContain('Price elasticity');
  });
});
