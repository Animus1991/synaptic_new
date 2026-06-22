import { describe, it, expect } from 'vitest';
import { synthesizeOutlineV2 } from './outlineSynthesis';
import type { GeneratedOutline } from './courseGenerator';

const source = `
Linear equations are the foundation of algebra. To understand quadratic equations, one must learn linear equations.
Quadratic equations introduce parabolas and the discriminant. Derivatives require functions. Limits require functions.
Calculus requires derivatives and requires limits.
`;

const baseOutline: GeneratedOutline = {
  title: 'Math Course',
  subject: 'Mathematics',
  difficulty: 'intermediate',
  summary: 'Overview of algebra and calculus.',
  topics: [
    {
      title: 'Calculus',
      description: 'Rates of change.',
      concepts: ['derivatives', 'limits', 'functions'],
      prerequisites: [],
      difficulty: 'intermediate',
      estimatedMinutes: 30,
    },
    {
      title: 'Quadratic Equations',
      description: 'Parabolas and discriminants.',
      concepts: ['quadratic equations', 'parabolas', 'discriminant'],
      prerequisites: [],
      difficulty: 'intermediate',
      estimatedMinutes: 25,
    },
    {
      title: 'Linear Equations',
      description: 'Algebraic foundations.',
      concepts: ['linear equations', 'algebra'],
      prerequisites: [],
      difficulty: 'intermediate',
      estimatedMinutes: 20,
    },
  ],
  glossary: [],
};

describe('outlineSynthesis v2', () => {
  it('reorders topics so prerequisites come first', async () => {
    const result = await synthesizeOutlineV2(source, baseOutline);
    const titles = result.topics.map((t) => t.title);
    const linearIdx = titles.indexOf('Linear Equations');
    const quadraticIdx = titles.indexOf('Quadratic Equations');
    expect(linearIdx).toBeLessThan(quadraticIdx);
  });

  it('assigns difficulty based on DAG tier', async () => {
    const result = await synthesizeOutlineV2(source, baseOutline);
    const linear = result.topics.find((t) => t.title === 'Linear Equations');
    expect(linear?.difficulty).toBe('beginner');
    const difficulties = new Set(result.topics.map((t) => t.difficulty));
    expect(difficulties.size).toBeGreaterThanOrEqual(1);
  });

  it('enriches prerequisites from concept graph', async () => {
    const result = await synthesizeOutlineV2(source, baseOutline);
    const quadratic = result.topics.find((t) => t.title === 'Quadratic Equations');
    expect(quadratic?.prerequisites.length ?? 0).toBeGreaterThan(0);
    expect(quadratic?.prerequisites).toContain('Linear Equations');
  });

  it('returns the same outline when there are no concepts', async () => {
    const empty = { ...baseOutline, topics: baseOutline.topics.map((t) => ({ ...t, concepts: [] })) };
    const result = await synthesizeOutlineV2(source, empty);
    expect(result.topics).toHaveLength(baseOutline.topics.length);
  });
});
