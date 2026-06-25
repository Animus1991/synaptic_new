import type { NumericCue } from './numericCues';

export type SensitivityCell = {
  cueId: string;
  label: string;
  deltaPct: number;
  outputDelta: number;
  intensity: number;
};

/**
 * One-at-a-time parameter perturbation — elasticity-style sensitivity per cue.
 * Harmonized with sandbox numeric bus and correlation `sandboxTopSensitivityCue`.
 */
export function buildParameterSensitivity(
  cues: NumericCue[],
  values: Record<string, number>,
  computeOutput: (trial: Record<string, number>) => number,
  perturbPct = 10,
): SensitivityCell[] {
  if (cues.length === 0) return [];

  const baselineOut = computeOutput(values);
  const cells: SensitivityCell[] = [];

  for (const cue of cues) {
    const current = values[cue.id] ?? cue.baseline;
    const bump = current * (perturbPct / 100);
    const trialVal = Math.min(cue.max, Math.max(cue.min, current + bump));
    const trial = { ...values, [cue.id]: trialVal };
    const out = computeOutput(trial);
    const outputDelta = out - baselineOut;
    const rel = Math.abs(outputDelta) / Math.max(Math.abs(baselineOut), 1e-6);
    cells.push({
      cueId: cue.id,
      label: cue.label,
      deltaPct: perturbPct,
      outputDelta,
      intensity: Math.min(1, rel),
    });
  }

  return cells.sort((a, b) => b.intensity - a.intensity);
}

/** Economics sandbox: equilibrium price sensitivity to demand/supply shifts. */
export function buildEconomicsSensitivity(
  demandShift: number,
  supplyShift: number,
  steps = 5,
): SensitivityCell[] {
  const eqP = (d: number, s: number) => (100 + d - s) / 2;
  const base = eqP(demandShift, supplyShift);
  const span = 20;
  const cells: SensitivityCell[] = [];

  for (const axis of ['demand', 'supply'] as const) {
    for (let i = 1; i <= steps; i++) {
      const delta = (span / steps) * i;
      const d = axis === 'demand' ? demandShift + delta : demandShift;
      const s = axis === 'supply' ? supplyShift + delta : supplyShift;
      const out = eqP(d, s);
      const outputDelta = out - base;
      cells.push({
        cueId: axis,
        label: axis === 'demand' ? 'Demand shift' : 'Supply shift',
        deltaPct: (delta / Math.max(Math.abs(base), 1)) * 100,
        outputDelta,
        intensity: Math.min(1, Math.abs(outputDelta) / 25),
      });
    }
  }

  return cells.sort((a, b) => b.intensity - a.intensity);
}

export function topSensitivityCue(cells: SensitivityCell[]): string | undefined {
  return cells[0]?.cueId;
}
