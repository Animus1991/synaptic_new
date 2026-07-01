import { describe, expect, it } from 'vitest';
import { checkAgentGrounding } from '../lib/grounding';
import {
  evaluateGroundingCase,
  evaluateGroundingFaithfulness,
} from './evalHarness';
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

describe('grounding eval gate', () => {
  it('passes faithfulness gate on grounded agent answers', () => {
    const content =
      'Price elasticity of demand measures how responsive quantity demanded is when prices change.';
    const report = checkAgentGrounding(content, [cite], { strict: true });
    expect(report.faithfulness).toBeGreaterThanOrEqual(0.5);
    expect(report.verified).toBe(true);
    expect(report.claimDetails.some((c) => c.source?.fileId === 'f1')).toBe(true);
  });

  it('fails gate when hallucinated entities appear', () => {
    const content =
      'Einstein invented macroeconomics in 1920. Price elasticity of demand measures responsiveness.';
    const report = checkAgentGrounding(content, [cite], { strict: true });
    expect(report.verified).toBe(false);
    expect(report.claimDetails.filter((c) => !c.grounded).length).toBeGreaterThan(0);
  });

  it('meets minimum faithfulness on mixed grounded answer', () => {
    const content =
      'Price elasticity of demand measures responsiveness. Markets can also experience supply shocks.';
    const report = checkAgentGrounding(content, [cite], { strict: false });
    expect(report.faithfulness).toBeGreaterThanOrEqual(0.35);
  });

  it('evaluates gold grounding cases from fixtures', () => {
    const evalReport = evaluateGroundingFaithfulness();
    expect(evalReport.results.length).toBeGreaterThanOrEqual(4);
    expect(evalReport.passRate).toBe(1);
    expect(evalReport.pass).toBe(true);
  });

  it('lesson fixture rejects hallucinated panels', () => {
    const result = evaluateGroundingCase({
      id: 'test-hallucination',
      source: 'Supply and demand determine market equilibrium.',
      kind: 'lesson',
      strict: true,
      expectVerified: false,
      minFaithfulness: 0.5,
      panels: [
        {
          badge: 'Core',
          title: 'Bad claim',
          blocks: [{ kind: 'paragraph', text: 'Einstein proved tariffs are always zero in 1920.' }],
        },
      ],
    });
    expect(result.pass).toBe(true);
    expect(result.verified).toBe(false);
  });
});
