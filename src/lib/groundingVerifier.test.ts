import { describe, expect, it } from 'vitest';
import { verifyGrounding } from './groundingVerifier';
import type { MessageCitation } from '../types';

const cite: MessageCitation = {
  chunkId: 'f#0',
  fileId: 'f1',
  fileName: 'notes.txt',
  locator: '¶1',
  charStart: 0,
  charEnd: 80,
  snippet: 'Price elasticity of demand measures responsiveness of quantity demanded to price changes.',
};

describe('verifyGrounding', () => {
  it('marks grounded when answer overlaps citation snippets', () => {
    const content =
      'Price elasticity of demand measures how responsive quantity demanded is when prices change. '
      + 'Inelastic demand means consumers buy similar quantities even when prices rise.';
    const report = verifyGrounding(content, [cite], { strict: true });
    expect(report.coverage).toBeGreaterThan(0.3);
    expect(report.verified).toBe(true);
  });

  it('fails strict mode without citations', () => {
    const report = verifyGrounding('A long factual sentence about macroeconomics and inflation dynamics in open economies.', [], {
      strict: true,
    });
    expect(report.verified).toBe(false);
  });
});
