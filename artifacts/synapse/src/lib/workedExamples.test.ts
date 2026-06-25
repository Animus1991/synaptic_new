import { describe, it, expect } from 'vitest';
import { mineWorkedExamples, scaffoldExample, workedExampleVariants } from './workedExamples';

const source = `
Linear equations. For example, solve 2x + 4 = 10. First subtract 4 from both sides to get 2x = 6.
Then divide both sides by 2. Therefore x = 3.

Quadratic equations. Suppose x² - 5x + 6 = 0. Factor the left side into (x - 2)(x - 3) = 0.
Set each factor to zero. So x = 2 or x = 3.
`;

describe('worked-example mining', () => {
  it('mines multi-step examples from text', () => {
    const examples = mineWorkedExamples(source, 'linear equations', 2);
    expect(examples.length).toBeGreaterThan(0);
    const linear = examples.find((e) => e.problem.includes('2x + 4 = 10'));
    expect(linear).toBeDefined();
    expect(linear!.steps.length).toBeGreaterThanOrEqual(2);
    expect(linear!.answer).toContain('x = 3');
  });

  it('estimates difficulty based on steps and numeric content', () => {
    const examples = mineWorkedExamples(source, 'quadratic equations', 1);
    const ex = examples[0];
    expect(ex).toBeDefined();
    expect(['beginner', 'intermediate', 'advanced']).toContain(ex!.difficulty);
  });

  it('produces three scaffolded variants', () => {
    const examples = mineWorkedExamples(source, 'linear equations', 1);
    const variants = scaffoldExample(examples[0]!, 'en');
    expect(variants).toHaveLength(3);
    expect(variants[0]!.kind).toBe('worked');
    expect(variants[1]!.kind).toBe('faded');
    expect(variants[2]!.kind).toBe('prompt');
    expect(variants[1]!.blanks).toBeDefined();
    expect(variants[1]!.blanks!.length).toBeGreaterThan(0);
  });

  it('returns null when no examples are found', () => {
    const variants = workedExampleVariants('This is just plain text.', 'quantum physics');
    expect(variants).toBeNull();
  });
});
