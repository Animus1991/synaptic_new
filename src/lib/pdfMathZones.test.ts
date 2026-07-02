import { describe, expect, it } from 'vitest';
import {
  detectMathZonesFromPage,
  groupPdfItemsIntoLines,
  isMathFontFamily,
  isMathSymbolHeavy,
} from './pdfMathZones';

function item(
  str: string,
  x: number,
  y: number,
  _fontFamily: string,
  width = str.length * 6,
): unknown {
  return {
    str,
    transform: [1, 0, 0, 1, x, y],
    width,
    height: 10,
    fontName: 'f1',
  };
}

const styles = {
  f1: { fontFamily: 'CMMI10' },
  f2: { fontFamily: 'TimesNewRoman' },
};

describe('isMathFontFamily', () => {
  it('detects Computer Modern math faces', () => {
    expect(isMathFontFamily('CMMI10')).toBe(true);
    expect(isMathFontFamily('CambriaMath')).toBe(true);
    expect(isMathFontFamily('TimesNewRoman')).toBe(false);
  });
});

describe('detectMathZonesFromPage', () => {
  it('flags lost text-layer comma gaps for OCR', () => {
    const items = [
      item('Έστω', 50, 200, 'TimesNewRoman', 40),
      item('συνάρτηση', 100, 200, 'TimesNewRoman', 80),
      item(',', 190, 200, 'TimesNewRoman', 6),
      item('η', 200, 200, 'TimesNewRoman', 12),
      item('γραφική', 220, 200, 'TimesNewRoman', 70),
    ];
    const zones = detectMathZonesFromPage(items, styles, 600, 800, 0);
    expect(zones.some((z) => z.kind === 'lost-text-layer' && z.needsOcr)).toBe(true);
  });

  it('detects embedded-font math lines without OCR', () => {
    const items = [
      item('Q', 50, 180, 'CMMI10', 12),
      item('=', 65, 180, 'CMR10', 8),
      item('a', 78, 180, 'CMMI10', 10),
      item('-', 90, 180, 'CMR10', 6),
      item('bP', 98, 180, 'CMMI10', 20),
    ];
    const zones = detectMathZonesFromPage(items, styles, 600, 800, 1);
    const embedded = zones.find((z) => z.kind === 'embedded-font');
    expect(embedded).toBeTruthy();
    expect(embedded?.needsOcr).toBe(false);
    expect(embedded?.latex).toContain('Q');
  });

  it('detects symbol-heavy equation lines', () => {
    const line = String.raw`$$ E_d = \frac{\%\Delta Q}{\%\Delta P} $$`;
    const romanStyles = { f2: { fontFamily: 'TimesNewRoman' } };
    const items = [{ ...item(line, 50, 160, 'TimesNewRoman', 300) as object, fontName: 'f2' }];
    const zones = detectMathZonesFromPage(items, romanStyles, 600, 800, 0);
    expect(zones.some((z) => z.kind === 'symbol-line')).toBe(true);
  });
});

describe('groupPdfItemsIntoLines', () => {
  it('groups items on the same y into one line', () => {
    const lines = groupPdfItemsIntoLines(
      [item('Hello', 50, 200, 'TimesNewRoman'), item('world', 100, 201, 'TimesNewRoman')],
      styles,
      800,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toBe('Hello world');
  });
});

describe('isMathSymbolHeavy', () => {
  it('returns true for equation-like strings', () => {
    expect(isMathSymbolHeavy('f(x)=x^2+1')).toBe(true);
    expect(isMathSymbolHeavy('Plain prose sentence.')).toBe(false);
  });
});
