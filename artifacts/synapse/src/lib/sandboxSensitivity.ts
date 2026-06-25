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

export type DeviationRow = {
  cueId: string;
  label: string;
  unit?: string;
  baseline: number;
  current: number;
  /** Signed absolute change of the current value vs. the notes baseline. */
  deltaAbs: number;
  /** Signed % change vs. baseline. Undefined/huge when baseline≈0 — see pctMeaningful. */
  deltaPct: number;
  /**
   * Whether deltaPct is safe to show as a percentage. False when the baseline is
   * ~0 (percent is mathematically undefined) or so small the percentage explodes
   * into indefensible numbers — in that case the UI shows the absolute change.
   */
  pctMeaningful: boolean;
  /** 0–100: fraction of the slider's own range the learner moved. Always defined. */
  movePct: number;
  direction: 'up' | 'down' | 'flat';
};

/**
 * Honest what-if readout: reports how far the learner has moved each parameter
 * from the value found in their notes. This makes no claim about relationships
 * between parameters — it only states each independent change, which is a fact
 * we can defend. Rows are sorted by how much of each slider's range was moved
 * (biggest mover first), which stays meaningful even for a zero baseline.
 */
export function buildDeviationReadout(
  cues: NumericCue[],
  values: Record<string, number>,
): DeviationRow[] {
  return cues
    .map((cue) => {
      const current = values[cue.id] ?? cue.baseline;
      const deltaAbs = current - cue.baseline;
      const baseMag = Math.abs(cue.baseline);
      const deltaPct = (deltaAbs / Math.max(baseMag, 1e-6)) * 100;
      // A percentage relative to a ~0 baseline is undefined/explosive, so only
      // trust it when the baseline is non-trivial and the result stays sane.
      const pctMeaningful = baseMag > 1e-9 && Math.abs(deltaPct) <= 999;
      const range = Math.abs(cue.max - cue.min);
      const movePct =
        range > 1e-9
          ? Math.min(100, (Math.abs(deltaAbs) / range) * 100)
          : Math.abs(deltaAbs) > 1e-9
            ? 100
            : 0;
      const direction: DeviationRow['direction'] =
        movePct < 0.5 ? 'flat' : deltaAbs > 0 ? 'up' : 'down';
      return {
        cueId: cue.id,
        label: cue.label,
        unit: cue.unit,
        baseline: cue.baseline,
        current,
        deltaAbs,
        deltaPct,
        pctMeaningful,
        movePct,
        direction,
      };
    })
    .sort((a, b) => b.movePct - a.movePct);
}

/** The parameter the learner has explored most (largest move from baseline). */
export function topDeviationCue(rows: DeviationRow[]): string | undefined {
  return rows.find((r) => r.direction !== 'flat')?.cueId;
}
