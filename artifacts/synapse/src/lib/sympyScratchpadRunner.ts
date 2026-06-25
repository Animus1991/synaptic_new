/**
 * Wave 6.6 — Pyodide + SymPy runner for scratchpad step validation.
 */

import { getPyodide } from './pyodideRunner';
import {
  buildSympyValidationPayload,
  validateScratchpadStepsNumericFallback,
  type ScratchpadSympyValidationResult,
  type ValidatedScratchpadStep,
} from './scratchpadSympyValidation';
import type { FormulaVariable } from './formulaSolver';

const SYMPY_VALIDATE_SCRIPT = `
import json
from sympy import sympify, simplify, Symbol

def _parse(s):
    s = str(s).strip().replace('^', '**')
    return sympify(s)

payload = __payload
rhs = payload.get('rhs', '')
step_items = payload.get('stepItems', [])
subs_map = payload.get('substitutions', {})

sym_subs = {}
for k, v in subs_map.items():
    sym_subs[Symbol(str(k))] = float(v)

steps_out = []
prev_expr = None
prev_num = None
ok = True
err = None

try:
    target = _parse(rhs) if rhs else None
    target_simp = str(simplify(target)) if target is not None else None
except Exception as e:
    target = None
    target_simp = None
    err = f'Target parse error: {e}'

for item in step_items:
    i = int(item['index'])
    raw = item['expr']
    try:
        expr = _parse(raw)
        simp = str(simplify(expr))
        num = float(expr.subs(sym_subs)) if sym_subs else None
        status = 'valid'
        msg = None

        if num is not None and prev_num is not None and abs(num - prev_num) > 1e-6:
            status = 'invalid'
            msg = 'Numeric value diverges from prior step'
            ok = False
        elif prev_expr is not None and num is None:
            diff = simplify(expr - prev_expr)
            if not diff.equals(0):
                status = 'invalid'
                msg = 'Not algebraically equivalent to prior step'
                ok = False

        steps_out.append({
            'index': i,
            'status': status,
            'message': msg,
            'sympyForm': simp if num is None else str(num),
        })
        prev_expr = expr
        if num is not None:
            prev_num = num
    except Exception as e:
        ok = False
        steps_out.append({
            'index': i,
            'status': 'invalid',
            'message': str(e),
        })

if ok and prev_expr is not None and target is not None:
  try:
    if sym_subs:
      final_num = float(prev_expr.subs(sym_subs))
      target_num = float(target.subs(sym_subs))
      if abs(final_num - target_num) > 1e-6:
        ok = False
        err = f'Final value {final_num} != target {target_num}'
    else:
      diff = simplify(prev_expr - target)
      if not diff.equals(0):
        ok = False
        err = 'Final step does not match formula RHS'
  except Exception as e:
    ok = False
    err = str(e)

__result_json = json.dumps({
    'ok': ok,
    'engine': 'sympy',
    'steps': steps_out,
    'simplifiedTarget': target_simp,
    'error': err,
})
`;

let sympyLoaded = false;

export async function ensureSympyLoaded(): Promise<boolean> {
  try {
    const pyodide = await getPyodide();
    if (!sympyLoaded) {
      await pyodide.loadPackage('sympy');
      sympyLoaded = true;
    }
    return true;
  } catch {
    return false;
  }
}

function mergeValidationSteps(
  stepLines: string[],
  parsedSteps: Array<Partial<ValidatedScratchpadStep> & { index: number }>,
): ValidatedScratchpadStep[] {
  const steps: ValidatedScratchpadStep[] = stepLines.map((text, index) => ({
    index,
    text,
    status: 'skipped',
  }));
  for (const row of parsedSteps) {
    const text = stepLines[row.index] ?? '';
    steps[row.index] = {
      index: row.index,
      text,
      status: row.status ?? 'skipped',
      message: row.message,
      sympyForm: row.sympyForm,
    };
  }
  return steps;
}

export async function validateScratchpadStepsWithSympy(
  formula: string,
  stepLines: string[],
  variables: FormulaVariable[],
  expectedResult?: number | null,
): Promise<ScratchpadSympyValidationResult> {
  const payload = buildSympyValidationPayload(formula, stepLines, variables);

  if (payload.stepItems.length === 0) {
    return {
      ok: false,
      engine: 'unavailable',
      steps: stepLines.map((text, index) => ({ index, text, status: 'skipped' as const })),
      error: 'No parseable steps to validate.',
    };
  }

  const sympyReady = await ensureSympyLoaded();
  if (!sympyReady) {
    return validateScratchpadStepsNumericFallback(stepLines, variables, expectedResult);
  }

  try {
    const pyodide = await getPyodide();
    pyodide.globals.set('__payload', payload);
    await pyodide.runPythonAsync(SYMPY_VALIDATE_SCRIPT);
    const json = String(pyodide.globals.get('__result_json') ?? '{}');
    const parsed = JSON.parse(json) as {
      ok: boolean;
      steps: Array<Partial<ValidatedScratchpadStep> & { index: number }>;
      simplifiedTarget?: string;
      error?: string | null;
    };

    return {
      ok: parsed.ok,
      engine: 'sympy',
      steps: mergeValidationSteps(stepLines, parsed.steps),
      simplifiedTarget: parsed.simplifiedTarget,
      error: parsed.error ?? undefined,
    };
  } catch (e) {
    const fallback = validateScratchpadStepsNumericFallback(stepLines, variables, expectedResult);
    return {
      ...fallback,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
