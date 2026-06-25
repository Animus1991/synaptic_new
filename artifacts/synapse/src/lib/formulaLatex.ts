/**
 * Heuristic conversion of note/scratchpad formulas to KaTeX-friendly TeX.
 * KaTeX tolerates plain ASCII (F = ma); we normalize common patterns.
 */
export function formulaToLatex(formula: string): string {
  let s = formula.trim();
  if (!s) return '';

  s = s.replace(/\bpi\b/gi, '\\pi');
  s = s.replace(/\btheta\b/gi, '\\theta');
  s = s.replace(/\balpha\b/gi, '\\alpha');
  s = s.replace(/\bbeta\b/gi, '\\beta');
  s = s.replace(/\bgamma\b/gi, '\\gamma');
  s = s.replace(/\bdelta\b/gi, '\\delta');
  s = s.replace(/\bsigma\b/gi, '\\sigma');
  s = s.replace(/\bmu\b/gi, '\\mu');
  s = s.replace(/\blambda\b/gi, '\\lambda');

  s = s.replace(/sqrt\(([^)]+)\)/gi, '\\sqrt{$1}');
  s = s.replace(/(\w+)\^(\w+)/g, '$1^{$2}');
  s = s.replace(/(\w+)\^(\d+)/g, '$1^{$2}');
  s = s.replace(/\*/g, ' \\cdot ');

  return s;
}
