import { describe, it, expect } from 'vitest';
import {
  evaluateAll,
  evaluateDocumentModelFixture,
  evaluateFixture,
  EVAL_FIXTURES,
} from './evalHarness';

describe('recognition eval harness', () => {
  it('evaluates the physics fixture', () => {
    const result = evaluateFixture('physics.md');
    expect(result.fixture).toBe('physics.md');
    expect(result.conceptRecall).toBeGreaterThan(0);
    expect(result.topicCount).toBeGreaterThan(0);
  });

  it('evaluates the law fixture', () => {
    const result = evaluateFixture('law.md');
    expect(result.fixture).toBe('law.md');
    expect(result.conceptRecall).toBeGreaterThan(0);
    expect(result.topicCount).toBeGreaterThan(0);
  });

  it('evaluates the Greek physics fixture (DocumentModel path)', () => {
    const result = evaluateDocumentModelFixture('physics-el.md');
    expect(result.fixture).toContain('physics-el.md');
    expect(result.conceptRecall).toBeGreaterThan(0);
    expect(result.topicCount).toBeGreaterThan(0);
  });

  it('evaluates DocumentModel on physics fixture', () => {
    const result = evaluateDocumentModelFixture('physics.md');
    expect(result.conceptRecall).toBeGreaterThanOrEqual(0.5);
    expect(result.topicCount).toBeGreaterThan(0);
  });

  it('aggregates a multi-fixture report against baseline thresholds', () => {
    const report = evaluateAll(EVAL_FIXTURES);
    expect(report.results).toHaveLength(EVAL_FIXTURES.length);
    expect(report.documentModelResults).toHaveLength(EVAL_FIXTURES.length);
    expect(report.averageConceptRecall).toBeGreaterThanOrEqual(0.6);
    expect(report.averageDocumentModelConceptRecall).toBeGreaterThanOrEqual(0.45);
    expect(report.passChecks.averageConceptRecall).toBe(true);
    expect(report.passChecks.perFixtureConceptRecall).toBe(true);
    expect(report.passChecks.documentModelConceptRecall).toBe(true);
    expect(report.pass).toBe(true);
  });
});
