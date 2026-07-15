import { describe, expect, it } from 'vitest';
import {
  buildParametricCoursePresets,
  looksLikeEconomicsCourse,
  resolveCourseSimulatorPresets,
} from './simulatorCoursePresets';
import type { NumericCue } from './numericCues';

const cues: NumericCue[] = [
  {
    id: 'cue-0',
    label: '40%',
    baseline: 40,
    min: 10,
    max: 70,
    unit: '%',
    context: 'elasticity near 40%',
  },
  {
    id: 'cue-1',
    label: '12',
    baseline: 12,
    min: 5,
    max: 20,
    context: 'quantity 12',
  },
];

describe('simulatorCoursePresets (TOOL-SM-02)', () => {
  it('detects economics wording', () => {
    expect(looksLikeEconomicsCourse('Supply and demand')).toBe(true);
    expect(looksLikeEconomicsCourse('Photosynthesis')).toBe(false);
  });

  it('builds parametric presets from cues', () => {
    const presets = buildParametricCoursePresets(cues);
    expect(presets).toHaveLength(4);
    expect(presets[0]!.id).toBe('baseline');
    expect(presets[0]!.values['cue-0']).toBe(40);
    expect(presets[1]!.values['cue-0']).toBeGreaterThan(40);
  });

  it('resolves economics mode to shared scenarios', () => {
    const pack = resolveCourseSimulatorPresets({
      economicsMode: true,
      numericCues: cues,
    });
    expect(pack.mode).toBe('economics');
    expect(pack.scenarios.length).toBe(4);
  });

  it('resolves note cues to parametric pack', () => {
    const pack = resolveCourseSimulatorPresets({
      economicsMode: false,
      numericCues: cues,
      concept: 'Cell division',
    });
    expect(pack.mode).toBe('parametric');
  });
});
