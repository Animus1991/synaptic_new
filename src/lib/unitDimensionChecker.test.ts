import { describe, expect, it } from 'vitest';
import {
  checkVariableUnits,
  formatDimVector,
  parseUnitDimensions,
} from './unitDimensionChecker';

describe('unitDimensionChecker (TOOL-SP-03)', () => {
  it('parses compound SI units', () => {
    const dim = parseUnitDimensions('m/s^2');
    expect(dim).toEqual({ M: 0, L: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 });
    expect(formatDimVector(dim!)).toBe('L·T^-2');
  });

  it('flags unrecognized units', () => {
    const result = checkVariableUnits([{ symbol: 'x', unit: 'blargh' }]);
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.message).toMatch(/Unrecognized/);
  });

  it('detects dimension mismatch across equals', () => {
    const result = checkVariableUnits(
      [
        { symbol: 'F', unit: 'N' },
        { symbol: 'm', unit: 'kg' },
      ],
      'F = m',
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes('Dimension mismatch'))).toBe(true);
  });

  it('accepts consistent Force = mass * accel style products', () => {
    const result = checkVariableUnits(
      [
        { symbol: 'F', unit: 'N' },
        { symbol: 'm', unit: 'kg' },
        { symbol: 'a', unit: 'm/s^2' },
      ],
      'F = m*a',
    );
    expect(result.ok).toBe(true);
  });
});
