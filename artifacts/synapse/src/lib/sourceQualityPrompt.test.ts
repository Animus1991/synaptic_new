import { describe, expect, it } from 'vitest';
import { isLowSourceQuality, LOW_SOURCE_QUALITY_THRESHOLD, lowSourceQualityMessage } from './sourceQualityPrompt';

describe('sourceQualityPrompt', () => {
  it('flags scores below threshold', () => {
    expect(isLowSourceQuality(37)).toBe(true);
    expect(isLowSourceQuality(LOW_SOURCE_QUALITY_THRESHOLD)).toBe(false);
    expect(isLowSourceQuality(80)).toBe(false);
  });

  it('includes score in message', () => {
    expect(lowSourceQualityMessage('en', 37)).toContain('37');
    expect(lowSourceQualityMessage('el', 37)).toContain('37');
  });

  it('treats null and undefined scores as not low', () => {
    expect(isLowSourceQuality(undefined)).toBe(false);
    expect(isLowSourceQuality(null)).toBe(false);
    expect(isLowSourceQuality(NaN)).toBe(false);
  });
});
