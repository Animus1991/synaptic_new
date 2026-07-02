import { describe, expect, it } from 'vitest';
import { applyMathZoneRepairs, injectLostMathLatex } from './mathOcrRepair';
import type { PdfMathZone } from './pdfMathZones';
import { isPlausibleMathLatex, normalizeMathOcrToLatex } from './mathOcrNormalize';

describe('normalizeMathOcrToLatex', () => {
  it('converts symbols and simple fractions', () => {
    expect(normalizeMathOcrToLatex('1 / 3')).toBe('\\frac{1}{3}');
    expect(normalizeMathOcrToLatex('x 2')).toBe('x^{2}');
    expect(normalizeMathOcrToLatex('f ( x )')).toBe('f(x)');
  });

  it('maps Greek letters to LaTeX commands', () => {
    expect(normalizeMathOcrToLatex('α + β')).toContain('\\alpha');
    expect(normalizeMathOcrToLatex('α + β')).toContain('\\beta');
  });
});

describe('isPlausibleMathLatex', () => {
  it('accepts typical formula OCR output', () => {
    expect(isPlausibleMathLatex('f(x)')).toBe(true);
    expect(isPlausibleMathLatex('hello world')).toBe(false);
  });
});

describe('injectLostMathLatex', () => {
  it('repairs Greek calculus comma gaps', () => {
    const line = 'Έστω συνάρτηση , η γραφική της παράσταση.';
    const out = injectLostMathLatex(line, 'f(x)');
    expect(out).toContain('$f(x)$');
    expect(out).not.toMatch(/συνάρτηση\s*,/);
  });
});

describe('applyMathZoneRepairs', () => {
  const lostZone: PdfMathZone = {
    id: 'z1',
    pageIndex: 0,
    bbox: { left: 10, top: 20, width: 50, height: 5 },
    kind: 'lost-text-layer',
    display: false,
    needsOcr: true,
    lineIndex: 1,
    lineText: 'Έστω συνάρτηση , η γραφική.',
  };

  it('injects OCR latex into the matching page line', () => {
    const pages = [`Title\n${lostZone.lineText}`];
    const { pageTexts, zones } = applyMathZoneRepairs(pages, [lostZone], { z1: 'f(x)' });
    expect(pageTexts[0]).toContain('$f(x)$');
    expect(zones[0]!.latex).toBe('f(x)');
  });
});
