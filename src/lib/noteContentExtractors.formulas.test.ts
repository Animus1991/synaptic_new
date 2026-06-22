import { describe, it, expect } from 'vitest';
import { extractFormulas, formulaToLatex } from './noteContentExtractors';

describe('formula extraction', () => {
  it('extracts LaTeX inline math', () => {
    const text = 'The kinetic energy is $KE = \\frac{1}{2}mv^2$ and momentum is $p = mv$.';
    const formulas = extractFormulas(text, undefined, 5);
    expect(formulas.length).toBeGreaterThanOrEqual(1);
    expect(formulas.some((f) => f.formula.includes('KE'))).toBe(true);
    expect(formulas.some((f) => f.formula.includes('p = mv'))).toBe(true);
  });

  it('extracts plain-text equations with =', () => {
    const text = 'Force equals mass times acceleration: F = m * a.';
    const formulas = extractFormulas(text);
    expect(formulas.length).toBeGreaterThan(0);
    expect(formulas[0]!.formula).toMatch(/F\s*=\s*m\s*\*\s*a/i);
  });

  it('extracts formulas from labeled lines', () => {
    const text = 'Formula: E = m c²';
    const formulas = extractFormulas(text);
    expect(formulas.length).toBeGreaterThan(0);
    expect(formulas[0]!.formula).toMatch(/E\s*=\s*m\s*c/);
  });

  it('converts plain formulas to LaTeX', () => {
    expect(formulaToLatex('F = m * a')).toBe('F = m * a');
    expect(formulaToLatex('E = m c²')).toBe('E = m c^{2}');
    expect(formulaToLatex('a/b')).toBe('\\frac{a}{b}');
    expect(formulaToLatex('$x^2$')).toBe('x^2');
  });

  it('does not return duplicates', () => {
    const text = 'F = m * a. F = m * a.';
    const formulas = extractFormulas(text);
    expect(formulas.length).toBe(1);
  });
});
