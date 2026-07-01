import { describe, expect, it } from 'vitest';
import {
  extractPanelClaims,
  passesGroundingFaithfulnessGate,
  verifyLessonPanelsFaithfulness,
} from './groundingFaithfulnessGate';
import type { WorkspacePanel } from './workspaceLessonPanels';

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

describe('groundingFaithfulnessGate', () => {
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
