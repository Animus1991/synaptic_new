/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { isMinimalThemeAttr } from './useMinimalTheme';

describe('isMinimalThemeAttr', () => {
  it('detects minimal themes', () => {
    expect(isMinimalThemeAttr('minimal')).toBe(true);
    expect(isMinimalThemeAttr('minimal-dark')).toBe(true);
    expect(isMinimalThemeAttr('blueprint')).toBe(false);
    expect(isMinimalThemeAttr('light')).toBe(false);
    expect(isMinimalThemeAttr(null)).toBe(false);
  });
});
