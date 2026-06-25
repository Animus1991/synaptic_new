/**
 * Pyodide Python runner — stub implementation.
 * Pyodide is not available in this environment; all calls return an error result.
 */

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

export async function getPyodide(): Promise<PyodideRuntime> {
  throw new Error('Pyodide is not available in this environment.');
}

export type PythonRunResult = {
  stdout: string;
  error?: string;
  resultPreview?: string;
};

export async function runPythonCode(_userCode: string): Promise<PythonRunResult> {
  return {
    stdout: '',
    error: 'Python sandbox is not available in this environment. Please use a local installation.',
  };
}

export async function validatePythonExercise(
  _userCode: string,
  _validate: (code: string) => boolean,
): Promise<{ passed: boolean; output: string }> {
  return {
    passed: false,
    output: 'Python validation is not available in this environment.',
  };
}
