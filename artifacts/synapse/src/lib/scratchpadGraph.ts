import { evaluateFormulaExpression, type FormulaVariable } from './formulaSolver';

export type PlotPoint = { x: number; y: number };

export type PlotSpec = {
  independent: string;
  dependent: string;
  xMin: number;
  xMax: number;
};

/** Detect y = f(x) style formulas plottable by sweeping one variable. */
export function detectPlotSpec(formula: string, vars: FormulaVariable[]): PlotSpec | null {
  const parts = formula.split('=');
  if (parts.length < 2) return null;
  const lhs = parts[0]!.trim();
  const rhs = parts.slice(1).join('=').trim();
  const lhsMatch = lhs.match(/^[a-zA-Z][a-zA-Z0-9_]*$/);
  if (!lhsMatch) return null;
  const dependent = lhsMatch[0]!;
  const emptyVars = vars.filter((v) => !v.value.trim());
  if (emptyVars.length !== 1) return null;
  const independent = emptyVars[0]!.symbol;
  if (!rhs.includes(independent)) return null;
  return { independent, dependent, xMin: -10, xMax: 10 };
}

export function sampleFormulaCurve(
  formula: string,
  vars: FormulaVariable[],
  spec: PlotSpec,
  steps = 48,
): PlotPoint[] {
  const points: PlotPoint[] = [];
  const filled = vars.map((v) => ({ ...v }));
  const step = (spec.xMax - spec.xMin) / Math.max(steps - 1, 1);

  for (let i = 0; i < steps; i++) {
    const x = spec.xMin + step * i;
    const trial = filled.map((v) => ({
      ...v,
      value: v.symbol === spec.independent ? String(x) : (v.value.trim() || '1'),
    }));
    try {
      const { result } = evaluateFormulaExpression(formula, trial);
      if (result !== null && Number.isFinite(result)) points.push({ x, y: result });
    } catch { /* skip invalid sample */ }
  }
  return points;
}

export function curveToSvgPath(
  points: PlotPoint[],
  width: number,
  height: number,
  padding = 24,
): string {
  if (points.length < 2) return '';
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const toX = (x: number) => padding + ((x - xMin) / xSpan) * innerW;
  const toY = (y: number) => padding + innerH - ((y - yMin) / ySpan) * innerH;

  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.x).toFixed(1)} ${toY(p.y).toFixed(1)}`)
    .join(' ');
}
