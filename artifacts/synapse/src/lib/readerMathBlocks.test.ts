import { describe, expect, it } from 'vitest';
import {
  extractReaderMathBlocks,
  hasInlineMath,
  isMathBoundaryLine,
} from './readerMathBlocks';
import { buildReaderSegments, splitSectionBodyIntoParagraphs } from './readerDocumentLayout';

describe('extractReaderMathBlocks', () => {
  it('extracts $$ display blocks', () => {
    const text = 'Intro\n\n$$\nE = mc^2\n$$\n\nOutro';
    const blocks = extractReaderMathBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.latex).toContain('E = mc^2');
    expect(blocks[0]!.display).toBe(true);
  });

  it('extracts \\[ \\] display blocks', () => {
    const text = 'Before\\[\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n\\]After';
    const blocks = extractReaderMathBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.latex).toContain('\\int_0^1');
  });

  it('extracts LaTeX environments', () => {
    const text = String.raw`\begin{align}
a &= b + c \\
d &= e
\end{align}`;
    const blocks = extractReaderMathBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.latex).toContain('a &= b');
  });
});

describe('hasInlineMath', () => {
  it('detects inline dollar and paren delimiters', () => {
    expect(hasInlineMath('Energy $E=mc^2$ scales.')).toBe(true);
    expect(hasInlineMath(String.raw`Use \(F=ma\) here.`)).toBe(true);
    expect(hasInlineMath('Plain prose only.')).toBe(false);
  });

  it('ignores display $$ regions when scanning inline', () => {
    const text = '$$\nx^2\n$$\nThen $y=1$ inline.';
    expect(hasInlineMath(text)).toBe(true);
  });
});

describe('splitSectionBodyIntoParagraphs math', () => {
  it('keeps display math lines separate from prose', () => {
    const body = [
      'The integral below holds.',
      '$$',
      '\\int_0^1 x^2\\,dx = \\frac{1}{3}',
      '$$',
      'End of section.',
    ].join('\n');
    const paras = splitSectionBodyIntoParagraphs(body);
    expect(paras.some((p) => p.includes('\\int_0^1'))).toBe(true);
    expect(paras.some((p) => p.includes('The integral'))).toBe(true);
  });

  it('recognizes math boundary lines', () => {
    expect(isMathBoundaryLine('$$')).toBe(true);
    expect(isMathBoundaryLine('\\begin{equation}')).toBe(true);
    expect(isMathBoundaryLine('Normal sentence.')).toBe(false);
  });
});

describe('buildReaderSegments math', () => {
  it('emits math segments for display equations', () => {
    const text = [
      '## Elasticity',
      '',
      'The definition is:',
      '',
      '$$',
      'E_d = \\frac{\\%\\Delta Q}{\\%\\Delta P}',
      '$$',
      '',
      'Inline form $E_d < 0$ for normal goods.',
    ].join('\n');
    const segments = buildReaderSegments(text);
    expect(segments.some((s) => s.kind === 'math')).toBe(true);
    const math = segments.find((s) => s.kind === 'math');
    expect(math?.mathLatex).toContain('E_d');
    expect(segments.some((s) => s.kind === 'paragraph' && hasInlineMath(s.content))).toBe(true);
  });
});
