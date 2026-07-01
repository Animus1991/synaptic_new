import { describe, expect, it } from 'vitest';
import { evaluateCourseQuality, resolveCourseStatus } from './courseQualityGates';
import type { GeneratedOutline } from './courseGenerator';

const STRONG_OUTLINE: GeneratedOutline = {
  title: 'Microeconomics',
  subject: 'Economics',
  difficulty: 'intermediate',
  summary: 'Supply and demand fundamentals.',
  topics: [
    {
      title: 'Supply and Demand',
      description: 'Market basics',
      concepts: ['Supply', 'Demand', 'Equilibrium'],
      prerequisites: [],
      difficulty: 'intermediate',
      estimatedMinutes: 25,
      objectives: ['Explain equilibrium'],
    },
    {
      title: 'Elasticity',
      description: 'Price sensitivity',
      concepts: ['Elasticity', 'Inelastic demand'],
      prerequisites: ['Supply and Demand'],
      difficulty: 'intermediate',
      estimatedMinutes: 20,
      objectives: ['Compute elasticity'],
    },
  ],
  glossary: [
    { term: 'Supply', definition: 'Quantity producers offer.' },
    { term: 'Demand', definition: 'Quantity consumers want.' },
  ],
};

const SPARSE_OUTLINE: GeneratedOutline = {
  title: 'x',
  subject: 'General',
  difficulty: 'beginner',
  summary: '',
  topics: [{ title: 'a', description: '', concepts: [], prerequisites: [], difficulty: 'beginner', estimatedMinutes: 10 }],
  glossary: [],
};

describe('evaluateCourseQuality', () => {
  it('passes a well-structured outline with source text', () => {
    const source = 'Supply and demand determine equilibrium. Elasticity measures price sensitivity. Inelastic demand barely changes with price.';
    const report = evaluateCourseQuality({ outline: STRONG_OUTLINE, sourceText: source });
    expect(report.passes).toBe(true);
    expect(report.overallScore).toBeGreaterThanOrEqual(58);
    expect(resolveCourseStatus(report)).toBe('ready');
  });

  it('flags sparse outline for needs_review', () => {
    const report = evaluateCourseQuality({ outline: SPARSE_OUTLINE });
    expect(report.passes).toBe(false);
    expect(resolveCourseStatus(report)).toBe('needs_review');
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it('detects prerequisite ordering violations', () => {
    const bad: GeneratedOutline = {
      ...STRONG_OUTLINE,
      topics: [
        { ...STRONG_OUTLINE.topics[0]!, prerequisites: ['Elasticity'] },
        STRONG_OUTLINE.topics[1]!,
      ],
    };
    const ordering = evaluateCourseQuality({ outline: bad }).gates.find((g) => g.id === 'ordering');
    expect(ordering?.pass).toBe(false);
  });
});
