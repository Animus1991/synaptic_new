/**
 * Normalize OCR output from formula crops into LaTeX-ish text (8B-alpha MVP).
 * Full pix2tex/LaTeX-OCR is a future 8B-β upgrade.
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

/** Best-effort OCR → LaTeX for inline/display repair. */
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

  // OCR often reads f ( x ) with spaces
  t = t.replace(/\b([A-Za-z])\s*\(\s*([A-Za-z])\s*\)/g, '$1($2)');
  t = t.replace(/\b([A-Za-z])\s*'\s*/g, "$1'");

  // Simple stacked fraction: "1 3" on one line with slash variant already handled
  t = t.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');

  // x 2 → x^2 (single-digit exponent)
  t = t.replace(/([A-Za-z])\s+(\d)(?!\d)/g, '$1^{$2}');

  // Strip stray punctuation from OCR noise
  t = t.replace(/[|]/g, '');

  return t.trim();
}

/** True when normalized output is plausibly formula content. */
export function isPlausibleMathLatex(latex: string): boolean {
  const t = latex.trim();
  if (t.length < 2) return false;
  if (/\\(frac|int|sum|sqrt|alpha|beta|gamma|Delta)/.test(t)) return true;
  if (/[=^_{}\\]/.test(t)) return true;
  if (/[A-Za-z]\([A-Za-z]\)/.test(t)) return true;
  if (/\d/.test(t) && /[+\-*/]/.test(t)) return true;
  return false;
}
