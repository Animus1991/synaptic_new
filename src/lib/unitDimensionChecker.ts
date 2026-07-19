/**
 * TOOL-SP-03 — lightweight unit / dimension checker for formula scratchpad vars.
 * Uses SI base dimensions: M (mass), L (length), T (time), I (current), Θ (temp), N (amount), J (luminous).
 */

export type BaseDim = 'M' | 'L' | 'T' | 'I' | 'Θ' | 'N' | 'J';

export type DimVector = Record<BaseDim, number>;

export type UnitCheckIssue = {
  symbol: string;
  unit: string;
  message: string;
};

export type UnitCheckResult = {
  ok: boolean;
  issues: UnitCheckIssue[];
  /** Per-variable resolved dimensions (empty vector = dimensionless / unknown). */
  dimensions: Record<string, DimVector>;
};

const ZERO: DimVector = { M: 0, L: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };

const UNIT_TABLE: Record<string, DimVector> = {
  // mass
  kg: { ...ZERO, M: 1 },
  g: { ...ZERO, M: 1 },
  // length
  m: { ...ZERO, L: 1 },
  cm: { ...ZERO, L: 1 },
  mm: { ...ZERO, L: 1 },
  km: { ...ZERO, L: 1 },
  // time
  s: { ...ZERO, T: 1 },
  sec: { ...ZERO, T: 1 },
  ms: { ...ZERO, T: 1 },
  min: { ...ZERO, T: 1 },
  h: { ...ZERO, T: 1 },
  // derived
  n: { ...ZERO, M: 1, L: 1, T: -2 }, // Newton
  j: { ...ZERO, M: 1, L: 2, T: -2 }, // Joule
  w: { ...ZERO, M: 1, L: 2, T: -3 }, // Watt
  pa: { ...ZERO, M: 1, L: -1, T: -2 },
  hz: { ...ZERO, T: -1 },
  v: { ...ZERO, M: 1, L: 2, T: -3, I: -1 },
  a: { ...ZERO, I: 1 },
  c: { ...ZERO, I: 1, T: 1 },
  ohm: { ...ZERO, M: 1, L: 2, T: -3, I: -2 },
  k: { ...ZERO, Θ: 1 },
  mol: { ...ZERO, N: 1 },
  // dimensionless
  '1': { ...ZERO },
  rad: { ...ZERO },
  deg: { ...ZERO },
  '%': { ...ZERO },
};

function emptyDim(): DimVector {
  return { ...ZERO };
}

function addDim(a: DimVector, b: DimVector, sign = 1): DimVector {
  const out = emptyDim();
  (Object.keys(ZERO) as BaseDim[]).forEach((k) => {
    out[k] = a[k] + sign * b[k];
  });
  return out;
}

function scaleDim(a: DimVector, n: number): DimVector {
  const out = emptyDim();
  (Object.keys(ZERO) as BaseDim[]).forEach((k) => {
    out[k] = a[k] * n;
  });
  return out;
}

function dimsEqual(a: DimVector, b: DimVector): boolean {
  return (Object.keys(ZERO) as BaseDim[]).every((k) => a[k] === b[k]);
}

function isZero(d: DimVector): boolean {
  return (Object.keys(ZERO) as BaseDim[]).every((k) => d[k] === 0);
}

/** Parse simple unit strings like `m/s^2`, `kg*m/s2`, `N·m`. */
export function parseUnitDimensions(unitRaw: string): DimVector | null {
  const unit = unitRaw.trim().toLowerCase().replace(/·/g, '*').replace(/μ/g, 'u');
  if (!unit) return emptyDim();
  if (UNIT_TABLE[unit]) return { ...UNIT_TABLE[unit]! };

  // split numerator / denominator
  const [numPart, ...denParts] = unit.split('/');
  let dim = emptyDim();
  const applySide = (side: string, sign: 1 | -1) => {
    const tokens = side.split(/[*·\s]+/).filter(Boolean);
    for (const tok of tokens) {
      const m = tok.match(/^([a-z%]+)(?:\^?(-?\d+))?$/i);
      if (!m) return false;
      const base = UNIT_TABLE[m[1]!.toLowerCase()];
      if (!base) return false;
      const exp = m[2] ? Number(m[2]) : 1;
      dim = addDim(dim, scaleDim(base, exp * sign));
    }
    return true;
  };
  if (!applySide(numPart ?? '', 1)) return null;
  for (const den of denParts) {
    if (!applySide(den, -1)) return null;
  }
  return dim;
}

export function formatDimVector(d: DimVector): string {
  const parts = (Object.keys(ZERO) as BaseDim[])
    .filter((k) => d[k] !== 0)
    .map((k) => (d[k] === 1 ? k : `${k}^${d[k]}`));
  return parts.length ? parts.join('·') : '1';
}

/**
 * Check variable units for parseability. Optionally verify LHS/RHS of `a = b`
 * style formula have matching dimensions when both sides' symbols carry units.
 */
export function checkVariableUnits(
  variables: Array<{ symbol: string; unit: string }>,
  formula?: string,
): UnitCheckResult {
  const issues: UnitCheckIssue[] = [];
  const dimensions: Record<string, DimVector> = {};

  for (const v of variables) {
    const unit = (v.unit ?? '').trim();
    if (!unit) {
      dimensions[v.symbol] = emptyDim();
      continue;
    }
    const dim = parseUnitDimensions(unit);
    if (!dim) {
      issues.push({
        symbol: v.symbol,
        unit,
        message: `Unrecognized unit "${unit}"`,
      });
      dimensions[v.symbol] = emptyDim();
    } else {
      dimensions[v.symbol] = dim;
    }
  }

  if (formula?.includes('=')) {
    const [lhs, rhs] = formula.split('=').map((s) => s.trim());
    if (lhs && rhs) {
      const lhsDim = inferExprDim(lhs, dimensions);
      const rhsDim = inferExprDim(rhs, dimensions);
      if (lhsDim && rhsDim && !isZero(lhsDim) && !isZero(rhsDim) && !dimsEqual(lhsDim, rhsDim)) {
        issues.push({
          symbol: lhs,
          unit: `${formatDimVector(lhsDim)} ≠ ${formatDimVector(rhsDim)}`,
          message: `Dimension mismatch across "=" (${formatDimVector(lhsDim)} vs ${formatDimVector(rhsDim)})`,
        });
      }
    }
  }

  return { ok: issues.length === 0, issues, dimensions };
}

/** Very small expression dim inference: products / quotients of known symbols. */
function inferExprDim(expr: string, dims: Record<string, DimVector>): DimVector | null {
  const cleaned = expr.replace(/\s+/g, '');
  // single symbol
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(cleaned) && dims[cleaned]) {
    return { ...dims[cleaned]! };
  }
  // a*b / c
  const tokens = cleaned.split(/([*/])/);
  if (tokens.length === 1) return null;
  let acc: DimVector | null = null;
  let op: '*' | '/' = '*';
  for (const tok of tokens) {
    if (tok === '*' || tok === '/') {
      op = tok;
      continue;
    }
    const sym = tok.replace(/[^A-Za-z0-9_]/g, '');
    const d = dims[sym];
    if (!d || isZero(d)) return null;
    if (!acc) {
      acc = { ...d };
      continue;
    }
    acc = addDim(acc, d, op === '*' ? 1 : -1);
  }
  return acc;
}
