import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { formulaToLatex } from '../../lib/formulaLatex';
import { cn } from '../../utils/cn';

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function FormulaLatexPreview({
  formula,
  display = true,
  className,
}: {
  formula: string;
  display?: boolean;
  className?: string;
}) {
  const html = useMemo(() => {
    const tex = formulaToLatex(formula);
    if (!tex) return null;
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
        strict: 'ignore',
      });
    } catch {
      return null;
    }
  }, [formula, display]);

  if (!html) {
    return (
      <code className={cn('type-body font-mono text-text-primary', className)}>{formula}</code>
    );
  }

  return (
    <span
      className={cn(display ? 'block overflow-x-auto py-2 text-center' : 'inline-block', className)}
      // eslint-disable-next-line react/no-danger -- KaTeX sanitized markup from TeX
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
