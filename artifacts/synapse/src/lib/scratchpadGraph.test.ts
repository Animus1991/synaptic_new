import { describe, expect, it } from 'vitest';
import { curveToSvgPath, detectPlotSpec, sampleFormulaCurve } from './scratchpadGraph';

describe('scratchpadGraph', () => {
  it('detects plottable linear formula', () => {
    const spec = detectPlotSpec('y = m * x + b', [
      { symbol: 'm', value: '2', unit: '' },
      { symbol: 'x', value: '', unit: '' },
      { symbol: 'b', value: '1', unit: '' },
    ]);
    expect(spec?.independent).toBe('x');
  });

  it('samples points and builds svg path', () => {
    const formula = 'y = m * x + b';
    const vars = [
      { symbol: 'm', value: '2', unit: '' },
      { symbol: 'x', value: '', unit: '' },
      { symbol: 'b', value: '0', unit: '' },
    ];
    const spec = detectPlotSpec(formula, vars)!;
    const points = sampleFormulaCurve(formula, vars, spec, 10);
    expect(points.length).toBeGreaterThan(2);
    expect(curveToSvgPath(points, 200, 100).startsWith('M')).toBe(true);
  });
});
