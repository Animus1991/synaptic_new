import type { ExtractedFormula } from './noteContentExtractors';

export type LatexStamp = {
  id: string;
  label: string;
  latex: string;
  category: 'notes' | 'algebra' | 'calculus' | 'greek' | 'geometry';
};

const STANDARD_STAMPS: LatexStamp[] = [
  { id: 'frac', label: 'Fraction', latex: '\\frac{a}{b}', category: 'algebra' },
  { id: 'sqrt', label: 'Square root', latex: '\\sqrt{x}', category: 'algebra' },
  { id: 'sum', label: 'Summation', latex: '\\sum_{i=1}^{n} x_i', category: 'calculus' },
  { id: 'int', label: 'Integral', latex: '\\int_a^b f(x)\\,dx', category: 'calculus' },
  { id: 'lim', label: 'Limit', latex: '\\lim_{x \\to 0} f(x)', category: 'calculus' },
  { id: 'vec', label: 'Vector', latex: '\\vec{v}', category: 'geometry' },
  { id: 'alpha', label: 'α', latex: '\\alpha', category: 'greek' },
  { id: 'beta', label: 'β', latex: '\\beta', category: 'greek' },
  { id: 'theta', label: 'θ', latex: '\\theta', category: 'greek' },
  { id: 'delta', label: 'Δ', latex: '\\Delta', category: 'greek' },
  { id: 'pi', label: 'π', latex: '\\pi', category: 'greek' },
  { id: 'infty', label: '∞', latex: '\\infty', category: 'algebra' },
];

/**
 * LaTeX stamp library — note formulas first (scratchpad/whiteboard correlation),
 * then standard math stamps.
 */
export function buildLatexStampLibrary(
  formulas: ExtractedFormula[],
  lang: 'en' | 'el' = 'en',
): LatexStamp[] {
  const fromNotes: LatexStamp[] = formulas.slice(0, 8).map((f) => ({
    id: `note-${f.id}`,
    label: f.name.slice(0, 28),
    latex: f.formula.replace(/\$/g, ''),
    category: 'notes' as const,
  }));

  const notesLabel = lang === 'el' ? 'Από σημειώσεις' : 'From notes';
  if (fromNotes.length > 0) {
    fromNotes[0] = { ...fromNotes[0]!, label: `${notesLabel}: ${fromNotes[0]!.label}` };
  }

  const seen = new Set<string>();
  return [...fromNotes, ...STANDARD_STAMPS].filter((s) => {
    const k = s.latex.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function stampToInsertText(stamp: LatexStamp): string {
  return `$${stamp.latex}$`;
}
