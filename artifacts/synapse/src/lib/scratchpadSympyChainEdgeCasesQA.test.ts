import { describe, expect, it } from 'vitest';
import {
  auditScratchpadSympyChain,
  classifyScratchpadLineEdge,
  hadUnitSuffixStripped,
  missingSubstitutionSymbols,
  scratchpadSympyEdgeLabel,
} from './scratchpadSympyChainEdgeCasesQA';
import { normalizeScratchpadStepLine, validateScratchpadStepsNumericFallback } from './scratchpadSympyValidation';

describe('scratchpadSympyChainEdgeCasesQA', () => {
  const vars = [
    { symbol: 'm', value: '2', unit: '' },
    { symbol: 'x', value: '3', unit: '' },
    { symbol: 'b', value: '1', unit: '' },
  ];

  it('detects unit suffix stripping', () => {
    expect(normalizeScratchpadStepLine('✓ F = 10 N')).toBe('10');
    expect(hadUnitSuffixStripped('✓ F = 10 N', '10')).toBe(true);
  });

  it('classifies warning lines', () => {
    const edge = classifyScratchpadLineEdge('⚠ Fill in variables', 0, vars);
    expect(edge.kind).toBe('warning-line');
  });

  it('detects missing substitutions', () => {
    const missing = missingSubstitutionSymbols('m*x + b', [
      { symbol: 'm', value: '', unit: '' },
      { symbol: 'x', value: '3', unit: '' },
    ]);
    expect(missing).toContain('m');
    expect(missing).toContain('b');
  });

  it('audits chain with parseable steps', () => {
    const report = auditScratchpadSympyChain({
      formula: 'y = m*x + b',
      stepLines: ['Step 1: m*x + b', 'Step 2: 2*3 + 1', '✓ y = 7'],
      variables: vars,
      lang: 'en',
    });
    expect(report.parseableCount).toBe(3);
    expect(report.bannerSummary).toBeTruthy();
  });

  it('flags chain divergence from numeric fallback', () => {
    const validation = validateScratchpadStepsNumericFallback(
      ['2*3 + 1', '99'],
      vars,
      7,
    );
    const report = auditScratchpadSympyChain({
      formula: 'y = m*x + b',
      stepLines: ['2*3 + 1', '99'],
      variables: vars,
      validation,
      lang: 'en',
    });
    expect(report.invalidStepCount).toBeGreaterThan(0);
    expect(report.ok).toBe(false);
  });

  it('provides bilingual edge labels', () => {
    expect(scratchpadSympyEdgeLabel('chain-divergence', 'en')).toBe('Chain break');
    expect(scratchpadSympyEdgeLabel('unit-stripped', 'el')).toContain('Μονάδες');
  });
});
