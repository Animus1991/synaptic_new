import { describe, expect, it } from 'vitest';
import {
  buildCombinedCitationText,
  mapCombinedOffsetToCitation,
  resolveSourceHighlight,
} from './groundingCitationMap';
import type { MessageCitation } from '../types';

const cite: MessageCitation = {
  chunkId: 'f#0',
  fileId: 'f1',
  fileName: 'notes.txt',
  locator: '¶1',
  charStart: 100,
  charEnd: 220,
  heading: 'Elasticity',
  snippet: 'Price elasticity of demand measures responsiveness of quantity demanded to price changes.',
};

describe('groundingCitationMap', () => {
  it('builds combined citation text with headings', () => {
    const text = buildCombinedCitationText([cite]);
    expect(text).toContain('Elasticity');
    expect(text).toContain('Price elasticity');
  });

  it('maps combined offset back to file span', () => {
    const combined = buildCombinedCitationText([cite]);
    const probe = combined.indexOf('Price elasticity');
    const highlight = mapCombinedOffsetToCitation([cite], probe, probe + 20);
    expect(highlight?.fileId).toBe('f1');
    expect(highlight!.charStart).toBeGreaterThanOrEqual(cite.charStart);
    expect(highlight!.charEnd).toBeLessThanOrEqual(cite.charEnd);
  });

  it('resolves source from claim probe when spans missing', () => {
    const highlight = resolveSourceHighlight([cite], {
      claim: 'Price elasticity of demand measures responsiveness of quantity demanded.',
      grounded: true,
      score: 0.8,
      spans: [],
    });
    expect(highlight?.fileId).toBe('f1');
  });
});
