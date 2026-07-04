import { describe, it, expect } from 'vitest';
import { runGlossa, GLOSSA_STARTER } from './glossaInterpreter';

describe('glossaInterpreter', () => {
  it('runs starter program', () => {
    const result = runGlossa(GLOSSA_STARTER);
    expect(result.ok).toBe(true);
    expect(result.output).toContain('6');
    expect(result.variables.z).toBe(6);
  });

  it('reports unsupported syntax', () => {
    const result = runGlossa('UNKNOWN OP\nΤΕΛΟΣ');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unsupported/i);
  });
});
