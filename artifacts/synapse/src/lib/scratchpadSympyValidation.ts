/**
 * Wave 6.6 — Scratchpad SymPy step validation (offline via Pyodide).
 */

import type { FormulaVariable } from './formulaSolver';
import { evaluateExpression } from './formulaSolver';

export type ScratchpadStepStatus = 'pending' | 'valid' | 'invalid' | 'skipped';

export type ValidatedScratchpadStep = {
  index: number;
  text: string;
  status: ScratchpadStepStatus;
  message?: string;
  sympyForm?: string;
};

export type ScratchpadSympyValidationResult = {
  ok: boolean;
  engine: 'sympy' | 'unavailable';
  steps: ValidatedScratchpadStep[];
  simplifiedTarget?: string;
  error?: string;
};

/** Normalize a scratchpad step line to a SymPy-parseable expression fragment. */
export function normalizeScratchpadStepLine(line: string): string | null {
  let s = line.trim();
  if (!s || s.startsWith('⚠')) return null;

  if (s.startsWith('✓')) {
    s = s.replace(/^✓\s*/, '').trim();
    const eq = s.indexOf('=');
    if (eq >= 0) s = s.slice(eq + 1).trim();
  }

  const stepPrefix = /^step\s+\d+\s*:/i;
  if (stepPrefix.test(s)) {
    s = s.replace(stepPrefix, '').trim();
  }

  if (s.includes('→')) {
    s = s.split('→').pop()!.trim();
  }

  if (/^result\s*=/i.test(s)) {
    s = s.replace(/^result\s*=/i, '').trim();
  }

  const eqIdx = s.indexOf('=');
  if (eqIdx > 0 && eqIdx < s.length - 1) {
    const lhs = s.slice(0, eqIdx).trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(lhs)) {
      s = s.slice(eqIdx + 1).trim();
    }
  }

  // Wave 6.8f — strip trailing SI units from numeric results (10 N → 10)
  if (/^[\d.]+\s+[A-Za-zΩμ]+(?:\/[A-Za-z]+)?$/i.test(s)) {
    s = s.replace(/^([\d.]+)\s+[A-Za-zΩμ]+(?:\/[A-Za-z]+)?$/i, '$1');
  }

  return s || null;
}

export function extractSympyStepExpressions(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const expr = normalizeScratchpadStepLine(line);
    if (expr) out.push(expr);
  }
  return out;
}

export function formulaToSympyParts(formula: string): { lhs: string; rhs: string } {
  const parts = formula.split('=');
  const lhs = (parts[0] ?? 'y').trim();
  const rhs = (parts.slice(1).join('=').trim() || formula).replace(/\^/g, '**');
  return { lhs, rhs };
}

export function buildSympyValidationPayload(
  formula: string,
  stepLines: string[],
  variables: FormulaVariable[],
): {
  lhs: string;
  rhs: string;
  stepItems: { index: number; expr: string }[];
  substitutions: Record<string, number>;
} {
  const { lhs, rhs } = formulaToSympyParts(formula);
  const substitutions: Record<string, number> = {};
  for (const v of variables) {
    const trimmed = v.value.trim();
    if (!trimmed) continue;
    const n = parseFloat(trimmed);
    if (!Number.isNaN(n)) substitutions[v.symbol] = n;
  }
  const stepItems: { index: number; expr: string }[] = [];
  stepLines.forEach((line, index) => {
    const expr = normalizeScratchpadStepLine(line);
    if (expr) stepItems.push({ index, expr });
  });
  return { lhs, rhs, stepItems, substitutions };
}

/** Numeric fallback when SymPy is unavailable — checks step chain evaluates consistently. */
export function validateScratchpadStepsNumericFallback(
  stepLines: string[],
  variables: FormulaVariable[],
  expectedResult?: number | null,
): ScratchpadSympyValidationResult {
  const payload = buildSympyValidationPayload('', stepLines, variables);
  const subs = payload.substitutions;

  const steps: ValidatedScratchpadStep[] = stepLines.map((text, index) => ({
    index,
    text,
    status: 'skipped',
  }));

  if (payload.stepItems.length === 0) {
    return {
      ok: false,
      engine: 'unavailable',
      steps,
      error: 'No parseable steps.',
    };
  }

  let prevVal: number | null = null;
  let ok = true;

  for (const item of payload.stepItems) {
    const raw = stepLines[item.index]!;
    let val: number | null = null;
    try {
      val = evaluateExpression(item.expr.replace(/\^/g, '**'), subs);
    } catch {
      val = null;
    }

    if (val == null) {
      ok = false;
      steps[item.index] = {
        index: item.index,
        text: raw,
        status: 'invalid',
        message: 'Could not evaluate numerically.',
      };
      continue;
    }

    if (prevVal != null && Math.abs(val - prevVal) > 1e-6) {
      ok = false;
      steps[item.index] = {
        index: item.index,
        text: raw,
        status: 'invalid',
        message: `Value ${val} ≠ previous ${prevVal}`,
        sympyForm: String(val),
      };
    } else {
      steps[item.index] = {
        index: item.index,
        text: raw,
        status: 'valid',
        sympyForm: String(val),
      };
    }
    prevVal = val;
  }

  if (expectedResult != null && prevVal != null && Math.abs(prevVal - expectedResult) > 1e-4) {
    ok = false;
  }

  return {
    ok,
    engine: 'unavailable',
    steps,
    error: ok ? undefined : 'Numeric chain mismatch (SymPy offline).',
  };
}
