import { describe, expect, it } from 'vitest';
import {
  excerptLooksCorrupted,
  gateWorkspaceStepExcerpt,
  prepareWorkspaceDisplayText,
  repairKnownLessonArtifacts,
} from './workspaceDisplayText';

describe('excerptLooksCorrupted', () => {
  it('flags known OCR / spell-gate corruption patterns', () => {
    expect(
      excerptLooksCorrupted(
        'The law of demand rates that the quantity demand falls as its price prices.',
      ),
    ).toBe(true);
    expect(excerptLooksCorrupted('An indifference course connects bundles.')).toBe(true);
  });

  it('accepts clean economics prose', () => {
    expect(
      excerptLooksCorrupted(
        'The law of demand states that the quantity demanded falls as its price rises.',
      ),
    ).toBe(false);
  });
});

describe('repairKnownLessonArtifacts', () => {
  it('fixes common economics OCR substitutions', () => {
    const corrupted =
      'The law of demand rates that the quantity demand falls as its price prices.';
    const fixed = repairKnownLessonArtifacts(corrupted);
    expect(fixed).toContain('states');
    expect(fixed).toContain('demanded');
    expect(fixed).toContain('rises');
    expect(fixed).not.toMatch(/price prices/i);
  });
});

describe('prepareWorkspaceDisplayText', () => {
  it('repairs corrupted demand prose toward readable economics text', () => {
    const corrupted =
      'The law of demand rates that, holding everything else constant, the quantity demand of a good falls as its price prices.';
    const repaired = prepareWorkspaceDisplayText(corrupted, 'Lecture_Notes_Micro.pdf');
    expect(repaired.toLowerCase()).toContain('states');
    expect(repaired.toLowerCase()).toContain('demanded');
    expect(repaired.toLowerCase()).not.toMatch(/price prices/i);
  });
});

describe('gateWorkspaceStepExcerpt', () => {
  it('falls back to repaired full text when excerpt is corrupted', () => {
    const full = prepareWorkspaceDisplayText(
      `1. Supply and Demand
The law of demand rates that, holding everything else constant, the quantity demand of a good falls as its price prices.`,
      'demo',
    );
    const bad = 'The law of demand rates that the quantity demand falls as its price prices.';
    const gated = gateWorkspaceStepExcerpt(bad, full, 'Supply and Demand', 'Supply & Demand');
    expect(gated.toLowerCase()).toContain('states');
    expect(gated.toLowerCase()).not.toMatch(/price prices/i);
  });
});
