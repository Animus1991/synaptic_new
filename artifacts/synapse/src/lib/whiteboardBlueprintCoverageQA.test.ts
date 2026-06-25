import { describe, expect, it } from 'vitest';
import {
  ALL_BLUEPRINT_KINDS,
  auditWhiteboardBlueprintCoverage,
  blueprintKindLabel,
  buildBlueprintCoverageMatrix,
  buildSyntheticPlanForKind,
  classifyBlueprintContext,
  inferKindReachability,
} from './whiteboardBlueprintCoverageQA';
import { buildDiagramCoachPlan } from './whiteboardDiagramCoach';

describe('whiteboardBlueprintCoverageQA', () => {
  it('covers all five blueprint kinds in matrix', () => {
    const matrix = buildBlueprintCoverageMatrix('en');
    expect(matrix).toHaveLength(5);
    expect(matrix.map((m) => m.kind).sort()).toEqual([...ALL_BLUEPRINT_KINDS].sort());
    for (const row of matrix) {
      expect(row.stepCount).toBeGreaterThanOrEqual(3);
      expect(row.toolHints.length).toBeGreaterThanOrEqual(2);
      expect(row.agentGuideChars).toBeGreaterThan(80);
    }
  });

  it('verifies each kind is reachable via inference', () => {
    const reach = inferKindReachability();
    for (const kind of ALL_BLUEPRINT_KINDS) {
      expect(reach[kind]).toBe(true);
    }
  });

  it('classifies sparse vs formula-rich context', () => {
    expect(classifyBlueprintContext({ formulaCount: 0, relatedCount: 0 })).toBe('empty-excerpt');
    expect(classifyBlueprintContext({ formulaCount: 3, relatedCount: 0 })).toBe('formula-rich');
    expect(classifyBlueprintContext({
      formulaCount: 0,
      relatedCount: 0,
      contrastPair: ['A', 'B'],
    })).toBe('contrast-pair');
  });

  it('audits active plan with coverage report', () => {
    const plan = buildDiagramCoachPlan({
      concept: 'Tariffs',
      lang: 'en',
      relatedConcepts: ['Quota', 'Welfare', 'Deadweight'],
      referenceExcerpt: 'Import tariffs raise domestic prices.',
    });
    const report = auditWhiteboardBlueprintCoverage({
      plan,
      lang: 'en',
      formulaCount: 0,
      relatedCount: 3,
      referenceExcerpt: 'Import tariffs raise domestic prices.',
    });
    expect(report.ok).toBe(true);
    expect(report.stepCount).toBeGreaterThanOrEqual(3);
    expect(report.agentGuideReady).toBe(true);
    expect(report.bannerSummary).toBeTruthy();
  });

  it('builds synthetic plans matching requested kinds', () => {
    expect(buildSyntheticPlanForKind('formula-web', 'en').kind).toBe('formula-web');
    expect(buildSyntheticPlanForKind('concept-map', 'en').kind).toBe('concept-map');
  });

  it('provides bilingual kind labels', () => {
    expect(blueprintKindLabel('formula-web', 'en')).toBe('Formula web');
    expect(blueprintKindLabel('formula-web', 'el')).toContain('τύπων');
  });
});
