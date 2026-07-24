import { describe, expect, it } from 'vitest';
import {
  isLightFamilyTheme,
  shouldApplyWarmSandPageScope,
  shouldUseSepiaHeatmap,
} from './useDocumentTheme';

describe('theme page scope (Wave K)', () => {
  it('treats light and spectrum as light-family', () => {
    expect(isLightFamilyTheme('light')).toBe(true);
    expect(isLightFamilyTheme('spectrum')).toBe(true);
    expect(isLightFamilyTheme('dark')).toBe(false);
    expect(isLightFamilyTheme('blueprint')).toBe(false);
  });

  it('applies warm-sand nest only for root light', () => {
    expect(shouldApplyWarmSandPageScope('light')).toBe(true);
    expect(shouldApplyWarmSandPageScope('spectrum')).toBe(false);
    expect(shouldApplyWarmSandPageScope('dark')).toBe(false);
    expect(shouldApplyWarmSandPageScope('blueprint')).toBe(false);
  });

  it('uses sepia heatmap only for light / warm-sand', () => {
    expect(shouldUseSepiaHeatmap('light')).toBe(true);
    expect(shouldUseSepiaHeatmap('warm-sand')).toBe(true);
    expect(shouldUseSepiaHeatmap('spectrum')).toBe(false);
    expect(shouldUseSepiaHeatmap('dark')).toBe(false);
  });
});
