import { describe, expect, it } from 'vitest';
import { buildSimulatorWhiteboardExport } from './simulatorWhiteboardBridge';

describe('simulatorWhiteboardBridge (TOOL-SM-03)', () => {
  it('exports economics equilibrium as scratchpad payload', () => {
    const payload = buildSimulatorWhiteboardExport({
      concept: 'Elasticity',
      economicsMode: true,
      demandShift: 20,
      supplyShift: 0,
      scenarioLabel: 'Demand boom',
    });
    expect(payload.name).toContain('Demand boom');
    expect(payload.formula).toMatch(/P\*/);
    expect(payload.steps?.some((s) => s.includes('ΔD'))).toBe(true);
    expect(payload.variables?.some((v) => v.symbol === 'P*')).toBe(true);
  });

  it('exports parametric cue values', () => {
    const payload = buildSimulatorWhiteboardExport({
      concept: 'Force',
      economicsMode: false,
      cues: [{
        id: 'cue-0',
        label: '9.8',
        baseline: 9.8,
        min: 5,
        max: 15,
        unit: 'm/s',
        context: 'g',
      }],
      cueValues: { 'cue-0': 12 },
    });
    expect(payload.steps?.[0]).toContain('12');
    expect(payload.variables?.[0]?.value).toBe('12');
  });
});
