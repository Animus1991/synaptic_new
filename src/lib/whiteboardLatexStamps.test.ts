import { describe, expect, it } from 'vitest';
import { buildLatexStampLibrary, stampToInsertText } from './whiteboardLatexStamps';

describe('whiteboardLatexStamps', () => {
  it('includes note formulas and standard stamps', () => {
    const lib = buildLatexStampLibrary([{ id: 'f1', name: 'Linear', formula: 'y = m x + b' }]);
    expect(lib.some((s) => s.category === 'notes')).toBe(true);
    expect(lib.some((s) => s.id === 'frac')).toBe(true);
  });

  it('wraps stamp latex for canvas text', () => {
    expect(stampToInsertText({ id: 'a', label: 'a', latex: '\\alpha', category: 'greek' })).toBe('$\\alpha$');
  });
});
