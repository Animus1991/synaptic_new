import { describe, expect, it } from 'vitest';
import { formulaToLatex } from './formulaLatex';

describe('formulaToLatex', () => {
  it('converts greek and sqrt', () => {
    expect(formulaToLatex('E = mc^2')).toContain('^{');
    expect(formulaToLatex('sqrt(x)')).toBe('\\sqrt{x}');
    expect(formulaToLatex('A = pi * r^2')).toContain('\\pi');
  });
});
