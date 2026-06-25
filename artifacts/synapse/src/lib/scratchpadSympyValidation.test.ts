import { describe, expect, it } from 'vitest';
import {
  buildSympyValidationPayload,
  extractSympyStepExpressions,
  formulaToSympyParts,
  normalizeScratchpadStepLine,
  validateScratchpadStepsNumericFallback,
} from './scratchpadSympyValidation';

describe('scratchpadSympyValidation', () => {
  it('normalizes compute output lines to expressions', () => {
    expect(normalizeScratchpadStepLine('Step 1: F = m*a')).toBe('m*a');
    expect(normalizeScratchpadStepLine('Step 2: Substitute → 5*2')).toBe('5*2');
    expect(normalizeScratchpadStepLine('✓ F = 10 N')).toBe('10');
  });

  it('extracts sympy expressions from step list', () => {
    const exprs = extractSympyStepExpressions([
      'Step 1: y = 2*x + 1',
      'Step 2: Substitute → 2*3 + 1',
      '⚠ Fill in variables',
      '✓ y = 7',
    ]);
    expect(exprs).toEqual(['2*x + 1', '2*3 + 1', '7']);
  });

  it('builds validation payload with substitutions', () => {
    const payload = buildSympyValidationPayload(
      'y = m*x + b',
      ['Step 1: m*x + b', 'Step 2: 2*3 + 1'],
      [
        { symbol: 'm', value: '2', unit: '' },
        { symbol: 'x', value: '3', unit: '' },
        { symbol: 'b', value: '1', unit: '' },
      ],
    );
    expect(payload.rhs).toBe('m*x + b');
    expect(payload.substitutions).toEqual({ m: 2, x: 3, b: 1 });
    expect(payload.stepItems.length).toBe(2);
  });

  it('formulaToSympyParts converts power operator', () => {
    expect(formulaToSympyParts('E = m*c^2').rhs).toBe('m*c**2');
  });

  it('numeric fallback validates consistent chain', () => {
    const result = validateScratchpadStepsNumericFallback(
      ['2*3 + 1', '7'],
      [
        { symbol: 'm', value: '2', unit: '' },
        { symbol: 'x', value: '3', unit: '' },
        { symbol: 'b', value: '1', unit: '' },
      ],
      7,
    );
    expect(result.steps.filter((s) => s.status === 'valid').length).toBeGreaterThan(0);
  });
});
