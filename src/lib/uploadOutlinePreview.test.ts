import { describe, expect, it } from 'vitest';
import { buildMaterialOutlinePreview } from './uploadOutlinePreview';

const STRUCTURED_NOTES = `
# Microeconomics — Supply and Demand

Supply is the quantity of a good that producers are willing and able to sell at each price level.
Demand is the quantity that consumers are willing and able to buy at each price level.
Market equilibrium occurs where the supply curve intersects the demand curve.
Definition: equilibrium price clears the market at the intersection of supply and demand.

# Price Elasticity

Price elasticity of demand measures how responsive quantity demanded is to a change in price.
When demand is inelastic, consumers buy similar quantities even when prices rise sharply.
When demand is elastic, small price changes cause large shifts in quantity demanded.
Example: if price rises by 10% and quantity falls by 20%, elasticity equals -2.
`.trim();

describe('uploadOutlinePreview', () => {
  it('builds section-grounded module preview from structured notes', () => {
    const preview = buildMaterialOutlinePreview(STRUCTURED_NOTES, ['micro-notes.md']);
    expect(preview).not.toBeNull();
    expect(preview!.outline.topics.length).toBeGreaterThanOrEqual(2);
    expect(preview!.structure.sectionCount).toBeGreaterThanOrEqual(2);
    expect(preview!.structure.kind).toBe('headings');
    const titles = preview!.outline.topics.map((t) => t.title.toLowerCase());
    expect(titles.some((t) => t.includes('supply') || t.includes('demand'))).toBe(true);
    expect(titles.some((t) => t.includes('elastic'))).toBe(true);
  });

  it('returns quality metrics aligned with source density', () => {
    const preview = buildMaterialOutlinePreview(STRUCTURED_NOTES, ['micro-notes.md']);
    expect(preview!.quality.metrics.wordCount).toBeGreaterThan(50);
    expect(preview!.quality.detectedTopicCount).toBe(preview!.outline.topics.length);
    expect(['weak', 'moderate', 'strong']).toContain(preview!.quality.band);
  });

  it('returns null for insufficient text', () => {
    expect(buildMaterialOutlinePreview('too short', ['x.txt'])).toBeNull();
  });
});
