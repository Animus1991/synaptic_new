import type { GlossaryEntry } from '../types';

export function findGlossaryTermMatch(
  word: string,
  glossary: GlossaryEntry[],
): GlossaryEntry | undefined {
  const w = word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  if (w.length < 3) return undefined;
  const exact = glossary.find((g) => g.term.toLowerCase() === w);
  if (exact) return exact;
  if (w.length < 5) return undefined;
  return glossary.find((g) => {
    const t = g.term.toLowerCase();
    return t.includes(w) || w.includes(t);
  });
}
