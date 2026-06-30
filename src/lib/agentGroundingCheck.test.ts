import { describe, expect, it } from 'vitest';
import { checkAgentGrounding } from './agentGroundingCheck';
import type { MessageCitation } from '../types';

const cite: MessageCitation = {
  chunkId: 'f#0',
  fileId: 'f1',
  fileName: 'notes.txt',
  locator: '¶1',
  charStart: 0,
  charEnd: 120,
  snippet: 'Price elasticity of demand measures responsiveness of quantity demanded to price changes.',
  heading: 'Elasticity',
};

describe('checkAgentGrounding', () => {
  it('passes when answer and spans align with citations', () => {
    const content =
      'Price elasticity of demand measures how responsive quantity demanded is when prices change.';
    const report = checkAgentGrounding(content, [cite], { strict: true });
    expect(report.coverage).toBeGreaterThan(0.3);
    expect(report.faithfulness).toBeGreaterThan(0);
    expect(report.verified).toBe(true);
    expect(report.ungroundedClaims).toHaveLength(0);
  });

  it('flags ungrounded factual claims in strict mode', () => {
    const content =
      'Einstein invented the telescope in 1920. Price elasticity of demand measures responsiveness.';
    const report = checkAgentGrounding(content, [cite], { strict: true });
    expect(report.ungroundedClaims.length).toBeGreaterThan(0);
    expect(report.verified).toBe(false);
  });

  it('fails strict mode without citations', () => {
    const report = checkAgentGrounding('A long factual claim about macroeconomics and inflation.', [], {
      strict: true,
    });
    expect(report.verified).toBe(false);
  });
});
