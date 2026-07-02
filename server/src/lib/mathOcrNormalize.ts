/**
 * Normalize OCR output from formula crops into LaTeX-ish text (8B-alpha MVP).
 * Kept in sync with `src/lib/mathOcrNormalize.ts` for the server OCR route.
 */

const GREEK_TO_LATEX: Record<string, string> = {
  α: '\\alpha',
  β: '\\beta',
  γ: '\\gamma',
  δ: '\\delta',
  ε: '\\epsilon',
  ζ: '\\zeta',
  η: '\\eta',
  θ: '\\theta',
  λ: '\\lambda',
  μ: '\\mu',
  π: '\\pi',
  ρ: '\\rho',
  σ: '\\sigma',
  φ: '\\phi',
  ψ: '\\psi',
  ω: '\\omega',
  Δ: '\\Delta',
  Σ: '\\Sigma',
  Ω: '\\Omega',
};

const SYMBOL_TO_LATEX: Record<string, string> = {
  '×': '\\times',
  '÷': '\\div',
  '≤': '\\leq',
  '≥': '\\geq',
  '≠': '\\neq',
  '≈': '\\approx',
  '∞': '\\infty',
  '∫': '\\int',
  '∑': '\\sum',
  '√': '\\sqrt',
  '−': '-',
  '–': '-',
  '—': '-',
};

export function normalizeMathOcrToLatex(raw: string): string {
  let t = raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!t) return '';

  for (const [sym, latex] of Object.entries(SYMBOL_TO_LATEX)) {
    t = t.split(sym).join(latex);
  }
  for (const [greek, latex] of Object.entries(GREEK_TO_LATEX)) {
    t = t.split(greek).join(latex);
  }

  t = t.replace(/\b([A-Za-z])\s*\(\s*([A-Za-z])\s*\)/g, '$1($2)');
  t = t.replace(/\b([A-Za-z])\s*'\s*/g, "$1'");
  t = t.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');
  t = t.replace(/([A-Za-z])\s+(\d)(?!\d)/g, '$1^{$2}');
  t = t.replace(/[|]/g, '');

  return t.trim();
}

export function isPlausibleMathLatex(latex: string): boolean {
  const t = latex.trim();
  if (t.length < 2) return false;
  if (/\\(frac|int|sum|sqrt|alpha|beta|gamma|Delta)/.test(t)) return true;
  if (/[=^_{}\\]/.test(t)) return true;
  if (/[A-Za-z]\([A-Za-z]\)/.test(t)) return true;
  if (/\d/.test(t) && /[+\-*/]/.test(t)) return true;
  return false;
}
