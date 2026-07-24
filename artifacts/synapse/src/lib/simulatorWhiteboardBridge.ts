/** TOOL-SM-03 — Serialize simulator graph / cue state for whiteboard import. */

import type { ScratchpadExport } from './workspaceScratchpadBridge';
import type { NumericCue } from './numericCues';

export type SimulatorWhiteboardSnapshot = {
  concept: string;
  economicsMode: boolean;
  demandShift?: number;
  supplyShift?: number;
  eqP?: number;
  eqQ?: number;
  cueValues?: Record<string, number>;
  cues?: NumericCue[];
  scenarioLabel?: string;
};

export function buildSimulatorWhiteboardExport(
  snap: SimulatorWhiteboardSnapshot,
): ScratchpadExport {
  const id = `sim-${Date.now().toString(36)}`;
  if (snap.economicsMode) {
    const eqP = snap.eqP ?? (100 + (snap.demandShift ?? 0) - (snap.supplyShift ?? 0)) / 2;
    const eqQ = snap.eqQ ?? eqP + (snap.supplyShift ?? 0);
    const demand = snap.demandShift ?? 0;
    const supply = snap.supplyShift ?? 0;
    return {
      id,
      name: snap.scenarioLabel
        ? `Simulator · ${snap.scenarioLabel}`
        : `Equilibrium · ${snap.concept || 'Market'}`,
      formula: `P*≈${eqP.toFixed(1)}, Q*≈${eqQ.toFixed(1)}`,
      steps: [
        `Demand shift ΔD = ${demand >= 0 ? '+' : ''}${demand}`,
        `Supply shift ΔS = ${supply >= 0 ? '+' : ''}${supply}`,
        `Equilibrium price P* ≈ ${eqP.toFixed(1)}`,
        `Equilibrium quantity Q* ≈ ${eqQ.toFixed(1)}`,
      ],
      variables: [
        { symbol: 'ΔD', value: String(demand), unit: '' },
        { symbol: 'ΔS', value: String(supply), unit: '' },
        { symbol: 'P*', value: eqP.toFixed(1), unit: '' },
        { symbol: 'Q*', value: eqQ.toFixed(1), unit: '' },
      ],
    };
  }

  const cues = snap.cues ?? [];
  const values = snap.cueValues ?? {};
  const lines = cues.map((c) => {
    const v = values[c.id] ?? c.baseline;
    const unit = c.unit === '%' ? '%' : c.unit ? ` ${c.unit}` : '';
    return `${c.label}: ${v.toFixed(c.unit === '%' ? 0 : 1)}${unit} (base ${c.baseline})`;
  });

  return {
    id,
    name: snap.scenarioLabel
      ? `Sandbox · ${snap.scenarioLabel}`
      : `Sandbox · ${snap.concept || 'Parameters'}`,
    formula: lines[0] ?? 'parametric sandbox',
    steps: lines.length > 0 ? lines : ['No adjustable cues'],
    variables: cues.map((c) => ({
      symbol: c.label.slice(0, 12),
      value: String(values[c.id] ?? c.baseline),
      unit: c.unit ?? '',
    })),
  };
}
