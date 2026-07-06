import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadQuizAttemptHistory,
  recordQuizAttemptHistory,
  replaceAllQuizAttemptHistories,
  mergeQuizAttemptHistories,
} from './quizAttemptHistory';

describe('quizAttemptHistory', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    });
    replaceAllQuizAttemptHistories({});
  });

  it('records and loads scoped attempts', () => {
    recordQuizAttemptHistory('scope:a', 'Elasticity', {
      accuracy: 70,
      meanConfidence: 3,
      wrongCount: 2,
      itemCount: 10,
    });
    const rows = loadQuizAttemptHistory('scope:a');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.accuracy).toBe(70);
    expect(rows[0]?.wrongCount).toBe(2);
  });

  it('merges remote and local by completedAt', () => {
    const local = {
      scope: [{
        scopeKey: 'scope',
        concept: 'A',
        accuracy: 50,
        meanConfidence: 2,
        wrongCount: 5,
        itemCount: 10,
        completedAt: '2026-07-01T10:00:00.000Z',
      }],
    };
    const remote = {
      scope: [{
        scopeKey: 'scope',
        concept: 'A',
        accuracy: 80,
        meanConfidence: 4,
        wrongCount: 1,
        itemCount: 10,
        completedAt: '2026-07-02T10:00:00.000Z',
      }],
    };
    const merged = mergeQuizAttemptHistories(local, remote, true);
    expect(merged.scope).toHaveLength(2);
    expect(merged.scope[0]?.accuracy).toBe(80);
  });
});
