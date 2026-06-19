/** Pyodide Python runner — loads from local public/pyodide (npm postinstall copy, same-origin). */

const INDEX_URL = `${import.meta.env.BASE_URL}pyodide/`;

const SALES_CSV = `region,category,revenue,sales
East,A,45200,120
East,B,38900,95
North,A,38900,88
North,B,52100,110
South,A,52100,130
South,B,41800,102
West,A,41800,99
West,B,45200,115`;

export const PANDAS_BOOTSTRAP = `
import pandas as pd
import io
_sales_csv = """${SALES_CSV.replace(/"/g, '\\"')}"""
df = pd.read_csv(io.StringIO(_sales_csv))
`;

type PyodideRuntime = {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { get: (name: string) => unknown; set: (name: string, value: unknown) => void };
  loadPackage: (pkgs: string | string[]) => Promise<void>;
};

type PyodideModule = {
  loadPyodide: (opts: { indexURL: string }) => Promise<PyodideRuntime>;
};

let pyodidePromise: Promise<PyodideRuntime> | null = null;
let bootstrapDone = false;

export async function getPyodide(): Promise<PyodideRuntime> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const mod = (await import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`)) as PyodideModule;
      const pyodide = await mod.loadPyodide({ indexURL: INDEX_URL });
      await pyodide.loadPackage(['pandas', 'numpy']);
      return pyodide;
    })();
  }
  const pyodide = await pyodidePromise;
  if (!bootstrapDone) {
    await pyodide.runPythonAsync(PANDAS_BOOTSTRAP);
    bootstrapDone = true;
  }
  return pyodide;
}

export type PythonRunResult = {
  stdout: string;
  error?: string;
  resultPreview?: string;
};

function formatPyValue(val: unknown): string {
  if (val == null) return 'None';
  if (typeof val === 'object' && val !== null && 'toString' in val) {
    try {
      return String(val);
    } catch {
      return '[object]';
    }
  }
  return String(val);
}

export async function runPythonCode(userCode: string): Promise<PythonRunResult> {
  try {
    const pyodide = await getPyodide();
    const wrapped = `
import sys
from io import StringIO
_buf = StringIO()
_old = sys.stdout
sys.stdout = _buf
_err = None
try:
${userCode.split('\n').map((l) => `    ${l}`).join('\n')}
except Exception as e:
    _err = str(e)
finally:
    sys.stdout = _old
_stdout = _buf.getvalue()
`;
    await pyodide.runPythonAsync(wrapped);
    const stdout = String(pyodide.globals.get('_stdout') ?? '');
    const err = pyodide.globals.get('_err');
    if (err) {
      return { stdout, error: String(err) };
    }
    let resultPreview: string | undefined;
    try {
      const result = pyodide.globals.get('result');
      if (result != null) resultPreview = formatPyValue(result);
    } catch {
      /* result may not exist */
    }
    return { stdout, resultPreview };
  } catch (e) {
    return { stdout: '', error: e instanceof Error ? e.message : String(e) };
  }
}

export async function validatePythonExercise(
  userCode: string,
  validate: (code: string) => boolean,
): Promise<{ passed: boolean; output: string }> {
  const run = await runPythonCode(userCode);
  if (run.error) {
    return { passed: false, output: `Error: ${run.error}` };
  }
  const preview = run.resultPreview ?? run.stdout;
  const passed = validate(userCode) && !run.error;
  return {
    passed,
    output: passed
      ? `✓ Pyodide execution OK\n${preview}`
      : `Output:\n${preview}\n\n✗ Validation failed — check groupby/aggregation syntax.`,
  };
}
