/**
 * Paragraph-aligned bilingual scroll — pairs source/companion columns by index
 * instead of naive scroll-ratio (which drifts when column heights differ).
 */

export function getParagraphElements(container: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

/** Index of the paragraph whose top is closest to the viewport anchor (30% from top). */
export function dominantParagraphIndex(container: HTMLElement, paragraphs: HTMLElement[]): number {
  if (paragraphs.length === 0) return 0;
  const anchor = container.scrollTop + container.clientHeight * 0.28;
  let best = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const el = paragraphs[i]!;
    if (el.offsetTop <= anchor + 4) best = i;
  }
  return best;
}

/**
 * Align companion column so paragraph `index` sits at the same visual offset
 * as in the source column.
 */
export function alignBilingualParagraph(
  sourceContainer: HTMLElement,
  companionContainer: HTMLElement,
  sourceParagraphs: HTMLElement[],
  companionParagraphs: HTMLElement[],
  index: number,
): void {
  const src = sourceParagraphs[index];
  const cmp = companionParagraphs[index];
  if (!src || !cmp) return;
  const offsetInView = src.offsetTop - sourceContainer.scrollTop;
  companionContainer.scrollTop = Math.max(0, cmp.offsetTop - offsetInView);
}

export function syncBilingualByParagraph(
  from: HTMLElement,
  to: HTMLElement,
  fromSelector: string,
  toSelector: string,
): void {
  const fromParas = getParagraphElements(from, fromSelector);
  const toParas = getParagraphElements(to, toSelector);
  if (fromParas.length === 0 || toParas.length === 0) return;
  const idx = dominantParagraphIndex(from, fromParas);
  const safeIdx = Math.min(idx, toParas.length - 1);
  alignBilingualParagraph(from, to, fromParas, toParas, safeIdx);
}

export function scrollBothToParagraph(
  sourceContainer: HTMLElement,
  companionContainer: HTMLElement,
  sourceSelector: string,
  companionSelector: string,
  index: number,
): void {
  const srcParas = getParagraphElements(sourceContainer, sourceSelector);
  const cmpParas = getParagraphElements(companionContainer, companionSelector);
  const src = srcParas[index];
  const cmp = cmpParas[index];
  if (!src) return;
  sourceContainer.scrollTo({ top: Math.max(0, src.offsetTop - 12), behavior: 'smooth' });
  if (cmp) {
    companionContainer.scrollTo({ top: Math.max(0, cmp.offsetTop - 12), behavior: 'smooth' });
  }
}

/** Paragraph index containing focus term (for correlation bus deep-link). */
export function paragraphIndexForTerm(paragraphs: string[], term?: string): number {
  if (!term?.trim()) return -1;
  const needle = term.trim().toLowerCase();
  return paragraphs.findIndex((p) => p.toLowerCase().includes(needle));
}
