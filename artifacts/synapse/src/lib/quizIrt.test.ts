import { describe, expect, it } from 'vitest';
import {
  estimateQuizDifficulty,
  formatQuizIrtForLearner,
  probabilityCorrect,
  targetQuizDifficulty,
  updateQuizAbility,
  buildQuizIrtDisplay,
} from './quizIrt';

describe('quizIrt', () => {
  it('computes Rasch probability', () => {
    expect(probabilityCorrect(0, 0)).toBeCloseTo(0.5, 2);
    expect(probabilityCorrect(1, 0)).toBeGreaterThan(0.5);
  });

  it('raises ability after correct response', () => {
    const next = updateQuizAbility({ ability: 0, responses: 2, correct: 1, lastUpdated: '' }, 1.5, true, 50);
    expect(next.ability).toBeGreaterThan(0);
    expect(next.responses).toBe(3);
  });

  it('targets harder items for high mastery', () => {
    const low = targetQuizDifficulty(0, 30);
    const high = targetQuizDifficulty(0.5, 85);
    expect(high).toBeGreaterThan(low);
  });

  it('estimates difficulty by quiz kind', () => {
    expect(estimateQuizDifficulty({ kind: 'matching', question: 'q', left: [], right: [], pairs: [] })).toBe(2.4);
  });

  it('formats learner-friendly IRT copy without raw theta', () => {
    const irt = buildQuizIrtDisplay(
      { kind: 'mc', question: 'q', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
      'Supply',
      0,
      50,
    );
    const copy = formatQuizIrtForLearner(irt, 'el', 0);
    expect(copy.readinessLabel).toContain('Άγνωστη');
    expect(copy.difficultyLabel).toContain('Βασική');
    expect(copy.probabilityLabel).toMatch(/~\d+%/);
    expect(copy.hint).toBeTruthy();
    expect(JSON.stringify(copy)).not.toContain('Ικανότητα');
  });
});
