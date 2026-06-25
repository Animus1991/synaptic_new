import { describe, expect, it } from 'vitest';
import { collectEmbeddedBlocks, splitTextWithEmbeddedBlocks } from './segmentationEmbeddedBlocks';
import { detectDocumentSections, expandDocumentSectionsWithEmbeddedBlocks } from './textSegmentation';

describe('segmentationEmbeddedBlocks (Pipeline P0)', () => {
  it('splits markdown table from surrounding prose', () => {
    const text = `Intro paragraph about elasticity.

| Good | Elasticity |
| --- | --- |
| Luxury | High |
| Salt | Low |

Conclusion paragraph with enough length to pass filters easily here.`;

    const pieces = splitTextWithEmbeddedBlocks(text);
    expect(pieces.some((p) => p.boundaryKind === 'table')).toBe(true);
    expect(pieces.some((p) => p.boundaryKind === 'paragraph')).toBe(true);
    expect(collectEmbeddedBlocks(text).some((b) => b.kind === 'table')).toBe(true);
  });

  it('splits display math from section body', () => {
    const text = `The demand function is defined below.

$$Q = a - bP$$

Where a and b are positive constants in the model.`;

    const pieces = splitTextWithEmbeddedBlocks(text);
    const math = pieces.find((p) => p.boundaryKind === 'math');
    expect(math).toBeTruthy();
    expect(math?.mathLatex).toContain('Q = a - bP');
    expect(math?.mathDisplay).toBe(true);
  });
});

describe('detectDocumentSections table/math blocks', () => {
  it('emits table boundaryKind in segmentation path', () => {
    const text = `# Elasticity

Price elasticity measures responsiveness.

| Region | Value |
| --- | --- |
| EU | 0.8 |
| US | 1.1 |

Applications include tax incidence analysis and market predictions.`;

    const sections = detectDocumentSections(text);
    const tableSec = sections.find((s) => s.boundaryKind === 'table');
    expect(tableSec).toBeTruthy();
    expect(tableSec?.table?.headers).toContain('Region');
    expect(tableSec?.text).toContain('|');
  });

  it('emits math boundaryKind in segmentation path', () => {
    const text = `# Utility

Expected utility combines probabilities and outcomes.

$$U = \\sum_i p_i u(x_i)$$

Risk aversion shapes portfolio choices in practice.`;

    const sections = detectDocumentSections(text);
    const mathSec = sections.find((s) => s.boundaryKind === 'math');
    expect(mathSec).toBeTruthy();
    expect(mathSec?.mathLatex).toContain('sum');
  });

  it('expandDocumentSectionsWithEmbeddedBlocks preserves heading on first piece', () => {
    const expanded = expandDocumentSectionsWithEmbeddedBlocks([{
      heading: 'Costs',
      text: `Fixed costs stay constant.

| Type | Example |
| --- | --- |
| Fixed | Rent |

Variable costs change with output volume significantly.`,
      boundaryKind: 'paragraph',
    }]);
    expect(expanded.some((s) => s.boundaryKind === 'table')).toBe(true);
    expect(expanded[0]?.heading).toBe('Costs');
  });
});
