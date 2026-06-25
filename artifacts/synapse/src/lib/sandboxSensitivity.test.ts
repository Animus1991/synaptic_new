import { describe, expect, it } from 'vitest';
import { buildEconomicsSensitivity, buildParameterSensitivity } from './sandboxSensitivity';
import type { NumericCue } from './numericCues';

describe('sandboxSensitivity', () => {
  it('ranks parameter perturbations', () => {
    const cues: NumericCue[] = [{
      id: 'a', label: 'A', baseline: 10, min: 0, max: 20, context: 'ctx',
    }];
    const cells = buildParameterSensitivity(cues, { a: 10 }, (v) => v.a ?? 10);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.intensity).toBeGreaterThan(0);
  });

  it('builds economics sensitivity grid', () => {
    const cells = buildEconomicsSensitivity(0, 0, 3);
    expect(cells.length).toBeGreaterThan(0);
  });
});
