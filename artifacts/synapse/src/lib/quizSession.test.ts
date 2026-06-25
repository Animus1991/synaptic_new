import { describe, expect, it } from 'vitest';
import {
  initQuizSession,
  meanConfidence,
  recordSessionAnswer,
  sessionAccuracy,
  type QuizSessionItem,
} from './quizSession';

const items: QuizSessionItem[] = [
  { id: 'q-0', quiz: { question: 'Q1', options: ['a', 'b'], correctIndex: 0 } },
  { id: 'q-1', quiz: { question: 'Q2', options: ['a', 'b'], correctIndex: 1 } },
];

describe('quizSession', () => {
  it('initializes multi-item session state', () => {
    const state = initQuizSession(`scope-${Date.now()}`, 'elasticity', items);
    expect(state.currentIndex).toBe(0);
    expect(state.items.length).toBe(2);
    expect(state.confidenceRatings).toEqual([]);
  });

  it('records answers with confidence and computes summary', () => {
    const scope = `scope-b-${Date.now()}`;
    let state = initQuizSession(scope, 'elasticity', items);
    state = recordSessionAnswer(state, true, 4);
    state = recordSessionAnswer(state, false, 2);
    expect(sessionAccuracy(state)).toBe(50);
    expect(meanConfidence(state)).toBe(3);
    expect(state.completedAt).toBeTruthy();
  });
});
