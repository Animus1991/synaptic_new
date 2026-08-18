import { describe, expect, it } from 'vitest';
import { parseLlmCardPayload, parseLlmQuizPayload } from './llmStudyContent';

describe('parseLlmQuizPayload', () => {
  it('accepts fenced JSON with mc questions', () => {
    const quizzes = parseLlmQuizPayload(`\`\`\`json
{"questions":[{"question":"What is elasticity?","options":["Slope","Responsiveness","Price","Tax"],"correctIndex":1}]}
\`\`\``);
    expect(quizzes).toHaveLength(1);
    expect(quizzes[0]).toMatchObject({ kind: 'mc', correctIndex: 1 });
  });

  it('drops malformed rows', () => {
    expect(parseLlmQuizPayload('{"questions":[{"question":"x"}]}')).toEqual([]);
  });
});

describe('parseLlmCardPayload', () => {
  it('dedupes fronts and requires a real back', () => {
    const cards = parseLlmCardPayload(JSON.stringify({
      cards: [
        { front: 'Elasticity', back: 'How quantity responds to price' },
        { front: 'elasticity', back: 'duplicate' },
        { front: 'X', back: 'short' },
      ],
    }));
    expect(cards).toHaveLength(1);
    expect(cards[0]?.front).toBe('Elasticity');
  });
});
