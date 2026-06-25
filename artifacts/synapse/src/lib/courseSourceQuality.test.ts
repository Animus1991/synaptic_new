import { describe, expect, it } from 'vitest';
import { adaptOutlineToSourceQuality, analyzeCourseSourceQuality, buildOutlinePreviewFromTitles } from './courseSourceQuality';

describe('courseSourceQuality', () => {
  it('flags sparse material and recommends fewer grounded modules', () => {
    const text = `
Elasticity matters in markets.
It changes when price changes.
This short note mentions the idea but does not define it clearly.
Students should remember the concept for exams.
    `.trim();

    const outline = buildOutlinePreviewFromTitles({
      title: 'Elasticity',
      subject: 'Economics',
      topics: ['Elasticity basics', 'Demand response', 'Price changes', 'Exam review', 'Applications'],
    });

    const quality = analyzeCourseSourceQuality(text, outline);
    expect(quality.needsMoreMaterial).toBe(true);
    expect(quality.band).toBe('weak');
    expect(quality.recommendedTopicCount).toBeLessThan(quality.detectedTopicCount);
  });

  it('compacts over-split outlines when source density is weak', () => {
    const text = `
Elasticity matters in markets.
It changes when price changes.
This short note mentions the idea but does not define it clearly.
Students should remember the concept for exams.
    `.trim();

    const outline = buildOutlinePreviewFromTitles({
      title: 'Elasticity',
      subject: 'Economics',
      topics: ['Elasticity basics', 'Demand response', 'Price changes', 'Revenue effects', 'Elastic vs inelastic', 'Applications'],
    });

    const adapted = adaptOutlineToSourceQuality(outline, analyzeCourseSourceQuality(text, outline));
    expect(adapted.outline.topics.length).toBeLessThan(outline.topics.length);
    expect(adapted.quality.outlineAdjusted).toBe(true);
    expect(adapted.quality.finalTopicCount).toBe(adapted.outline.topics.length);
  });

  it('preserves richer structured material without forcing compaction', () => {
    const text = `
# Demand
Demand describes the quantity consumers are willing and able to buy at different prices.
Price elasticity of demand measures the responsiveness of quantity demanded to a change in price.
Example: if price rises by 10% and quantity falls by 20%, elasticity equals -2.
Definition: Elastic demand means consumers respond strongly to price changes.

# Revenue
Elastic demand implies that lowering price can increase total revenue.
Inelastic demand implies that raising price can increase total revenue.
Managers use total revenue tests to classify whether a product is elastic or inelastic.

# Applications
Managers compare elastic and inelastic products when setting pricing strategy.
| Type | Elastic | Inelastic |
| ---- | ------- | --------- |
| Quantity response | Large | Small |
| Revenue effect | Lower price may raise revenue | Higher price may raise revenue |

# Practice
Worked example: suppose the price of a streaming service falls by 5% and demand rises by 12%.
Calculate elasticity and explain why the result implies elastic demand.
Formula: Ed = % change in quantity demanded / % change in price.
    `.trim();

    const outline = buildOutlinePreviewFromTitles({
      title: 'Elasticity',
      subject: 'Economics',
      topics: ['Demand', 'Revenue', 'Applications'],
    });

    const quality = analyzeCourseSourceQuality(text, outline);
    const adapted = adaptOutlineToSourceQuality(outline, quality);
    expect(quality.band).not.toBe('weak');
    expect(adapted.outline.topics.length).toBe(outline.topics.length);
    expect(adapted.quality.outlineAdjusted).toBe(false);
  });
});
