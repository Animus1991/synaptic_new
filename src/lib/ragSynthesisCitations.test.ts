import { describe, it, expect } from 'vitest';
import { ragSourcesToCitations } from './ragSynthesisCitations';

describe('ragSourcesToCitations', () => {
  it('maps RAG synthesis sources to agent citations', () => {
    const citations = ragSourcesToCitations([
      {
        id: 'file-1#0',
        text: 'Limits and continuity overview.',
        score: 0.91,
        fileId: 'file-1',
        fileName: 'calc.pdf',
        charStart: 120,
        charEnd: 180,
        page: 3,
        heading: 'Chapter 2',
      },
    ]);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.fileName).toBe('calc.pdf');
    expect(citations[0]?.locator).toBe('p.3');
    expect(citations[0]?.charStart).toBe(120);
  });
});
