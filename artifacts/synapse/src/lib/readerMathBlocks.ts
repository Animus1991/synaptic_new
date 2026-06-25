/**
 * LaTeX / math block detection for the Cognitive Reader.
 * Preserves display equations and inline delimiters before paragraph flow
 * merges or splits them.
 */

export interface ExtractedMathBlock {
  latex: string;
  display: boolean;
  charStart: number;
  charEnd: number;
}

const LATEX_ENV_RE =
  /\\begin\{(equation\*?|align\*?|gather\*?|multline\*?|eqnarray\*?)\}([\s\S]*?)\\end\{\1\}/g;

/** True when text has inline `$…$` or `\(...\)` (not display `$$`). */
export function hasInlineMath(text: string): boolean {
  if (!text.includes('$') && !text.includes('\\(')) return false;
  const stripped = stripDisplayMathRegions(text);
  if (/\$[^$\n]+?\$/.test(stripped)) return true;
  if (/\\\([^\\\n]+\\\)/.test(stripped)) return true;
  return false;
}

function stripDisplayMathRegions(text: string): string {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\\\[[\s\S]*?\\\]/g, '')
    .replace(LATEX_ENV_RE, '');
}

function overlaps(a: ExtractedMathBlock, b: ExtractedMathBlock): boolean {
  return Math.max(a.charStart, b.charStart) < Math.min(a.charEnd, b.charEnd);
}

function pushBlock(blocks: ExtractedMathBlock[], candidate: ExtractedMathBlock) {
  if (!candidate.latex.trim()) return;
  if (blocks.some((b) => overlaps(b, candidate))) return;
  blocks.push(candidate);
}

/** Extract display math blocks with stable char offsets into `text`. */
export function extractReaderMathBlocks(text: string): ExtractedMathBlock[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const blocks: ExtractedMathBlock[] = [];

  for (const m of normalized.matchAll(LATEX_ENV_RE)) {
    const raw = m[0]!;
    const env = m[1]!;
    const body = m[2] ?? '';
    pushBlock(blocks, {
      latex: body.trim(),
      display: true,
      charStart: m.index!,
      charEnd: m.index! + raw.length,
    });
    void env;
  }

  let i = 0;
  while (i < normalized.length) {
    if (normalized.startsWith('\\[', i)) {
      const close = normalized.indexOf('\\]', i + 2);
      if (close >= 0) {
        pushBlock(blocks, {
          latex: normalized.slice(i + 2, close).trim(),
          display: true,
          charStart: i,
          charEnd: close + 2,
        });
        i = close + 2;
        continue;
      }
    }

    if (normalized[i] === '$' && normalized[i + 1] === '$') {
      const close = normalized.indexOf('$$', i + 2);
      if (close >= 0) {
        pushBlock(blocks, {
          latex: normalized.slice(i + 2, close).trim(),
          display: true,
          charStart: i,
          charEnd: close + 2,
        });
        i = close + 2;
        continue;
      }
    }

    i += 1;
  }

  return blocks.sort((a, b) => a.charStart - b.charStart);
}

/** Lines that start display math should not be merged into flowed paragraphs. */
export function isMathBoundaryLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith('$$')) return true;
  if (t.startsWith('\\[')) return true;
  if (/^\\begin\{/.test(t)) return true;
  if (t.endsWith('$$') && t.length > 4) return true;
  if (t.endsWith('\\]')) return true;
  if (/^\\end\{/.test(t)) return true;
  return false;
}

/** Heuristic: PDF/Markdown line is equation content, not a section title. */
export function isMathLikeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (isMathBoundaryLine(t)) return true;
  if (/\\\(|\\\[|\$\$?/.test(t)) return true;
  if (/\\(?:frac|sum|int|sqrt|Delta|alpha|beta|gamma|cdot|left|right|begin|end|text)\b/.test(t)) return true;
  if (/^[^=\n]{1,24}=\s*\\/.test(t)) return true;
  if (/\\%/.test(t)) return true;
  return false;
}
