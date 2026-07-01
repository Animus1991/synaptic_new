import { describe, expect, it } from 'vitest';
import type { MessageCitation } from '../../types';
import type { WorkspacePanel } from '../workspaceLessonPanels';
import {
  applyAgentGroundingGate,
  buildCombinedCitationText,
  checkAgentGrounding,
  extractPanelClaims,
  mapCombinedOffsetToCitation,
  passesGroundingFaithfulnessGate,
  resolveSourceHighlight,
  verifyAnswer,
  verifyCitationOverlap,
  verifyGrounding,
  verifyLessonPanelsFaithfulness,
} from './index';

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

const panels: WorkspacePanel[] = [
  {
    badge: 'Core',
    title: 'Elasticity',
    blocks: [
      {
        kind: 'paragraph',
        text: 'Price elasticity of demand measures responsiveness of quantity demanded to price changes.',
      },
    ],
  },
];

describe('span verification', () => {
  const source = `
The speed of light in a vacuum is 299,792,458 m/s.
Newton formulated the laws of motion.
The Earth orbits the Sun at an average distance of 149.6 million km.
  `.trim();

  it('grounds numeric claims', () => {
    const result = verifyGrounding(['The speed of light is 299,792,458 m/s.'], source, { strict: true });
    expect(result.checks[0]!.grounded).toBe(true);
    expect(result.strictPass).toBe(true);
  });

  it('grounds entity claims', () => {
    const result = verifyGrounding(['Newton created the laws of motion.'], source);
    expect(result.checks[0]!.grounded).toBe(true);
  });

  it('flags ungrounded claims', () => {
    const result = verifyGrounding(['Einstein invented the telescope.'], source, { strict: true });
    expect(result.checks[0]!.grounded).toBe(false);
    expect(result.strictPass).toBe(false);
  });

  it('verifies a full answer', () => {
    const answer = 'The speed of light is 299,792,458 m/s. Newton formulated the laws of motion.';
    const result = verifyAnswer(answer, source);
    expect(result.faithfulness).toBeGreaterThan(0.8);
    expect(result.groundedRatio).toBeGreaterThan(0.5);
  });

  it('matches numbers with different formatting', () => {
    const result = verifyGrounding(['The average distance is 149.6 million km.'], source);
    expect(result.checks[0]!.grounded).toBe(true);
  });
});

describe('citation overlap', () => {
  it('marks grounded when answer overlaps citation snippets', () => {
    const content =
      'Price elasticity of demand measures how responsive quantity demanded is when prices change. '
      + 'Inelastic demand means consumers buy similar quantities even when prices rise.';
    const report = verifyCitationOverlap(content, [cite], { strict: true });
    expect(report.coverage).toBeGreaterThan(0.3);
    expect(report.verified).toBe(true);
  });

  it('fails strict mode without citations', () => {
    const report = verifyCitationOverlap(
      'A long factual sentence about macroeconomics and inflation dynamics in open economies.',
      [],
      { strict: true },
    );
    expect(report.verified).toBe(false);
  });
});

describe('citation map', () => {
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

describe('agent grounding', () => {
  it('passes when answer and spans align with citations', () => {
    const content =
      'Price elasticity of demand measures how responsive quantity demanded is when prices change.';
    const report = checkAgentGrounding(content, [cite], { strict: true });
    expect(report.coverage).toBeGreaterThan(0.3);
    expect(report.faithfulness).toBeGreaterThan(0);
    expect(report.verified).toBe(true);
    expect(report.ungroundedClaims).toHaveLength(0);
    expect(report.claimDetails.length).toBeGreaterThan(0);
    expect(report.claimDetails.every((c) => c.grounded)).toBe(true);
  });

  it('flags ungrounded factual claims in strict mode', () => {
    const content =
      'Einstein invented the telescope in 1920. Price elasticity of demand measures responsiveness.';
    const report = checkAgentGrounding(content, [cite], { strict: true });
    expect(report.ungroundedClaims.length).toBeGreaterThan(0);
    expect(report.verified).toBe(false);
    expect(report.claimDetails.some((c) => !c.grounded)).toBe(true);
  });

  it('fails strict mode without citations', () => {
    const report = checkAgentGrounding('A long factual claim about macroeconomics and inflation.', [], {
      strict: true,
    });
    expect(report.verified).toBe(false);
  });

  it('prefixes unverified agent content in strict mode', () => {
    const { content, gatePassed } = applyAgentGroundingGate(
      'Einstein invented the telescope in 1920.',
      [cite],
      { strict: true, lang: 'en' },
    );
    expect(gatePassed).toBe(false);
    expect(content).toContain('could not be fully verified');
  });
});

describe('faithfulness gate', () => {
  it('extracts claims from lesson panels', () => {
    const claims = extractPanelClaims(panels);
    expect(claims.some((c) => c.includes('elasticity'))).toBe(true);
  });

  it('passes grounded lesson panels against source', () => {
    const source = 'Price elasticity of demand measures responsiveness of quantity demanded to price changes.';
    const report = verifyLessonPanelsFaithfulness(panels, source, true);
    expect(report.faithfulness).toBeGreaterThanOrEqual(0.5);
  });

  it('fails hallucinated numeric claims', () => {
    const report = passesGroundingFaithfulnessGate(
      ['Einstein invented macroeconomics in 1920.'],
      'Price elasticity of demand measures responsiveness.',
      { strict: true },
    );
    expect(report.verified).toBe(false);
    expect(report.ungroundedClaims.length).toBeGreaterThan(0);
  });
});
