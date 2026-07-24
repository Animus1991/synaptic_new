import { describe, expect, it } from 'vitest';
import { resolveToolAiRoute, toolAiCanUseLlm } from './toolAiAction';
import { diagnoseQuizError, quizErrorKindLabel } from './quizErrorDiagnosis';
import { buildPathTryChips, pathFocusFromQuizMiss, pathFocusFromWeakArea } from './pathFocus';
import { buildSmartFlashcard } from './smartFlashcard';
import { buildScratchpadStepHint } from './scratchpadStepHint';
import type { QuizSessionItem } from './quizSession';

const mcItem: QuizSessionItem = {
  id: 'q1',
  quiz: {
    kind: 'mc',
    question: 'What is elasticity?',
    options: ['A', 'B', 'C'],
    correctIndex: 0,
  },
};

describe('toolAiAction routing', () => {
  it('forces local when preferLocal', () => {
    expect(resolveToolAiRoute({
      intent: 'quiz-error-diagnosis',
      settings: { openaiApiKey: 'sk-test' } as never,
      preferLocal: true,
    })).toBe('local');
  });

  it('routes path-try to agent-handoff when LLM available', () => {
    expect(resolveToolAiRoute({
      intent: 'path-try',
      settings: { openaiApiKey: 'sk-test' } as never,
    })).toBe('agent-handoff');
  });

  it('toolAiCanUseLlm respects preferLocal', () => {
    expect(toolAiCanUseLlm({ openaiApiKey: 'sk-x' } as never, true)).toBe(false);
    expect(toolAiCanUseLlm(undefined, false)).toBe(false);
  });
});

describe('quizErrorDiagnosis offline', () => {
  it('returns heuristic diagnosis without LLM', async () => {
    const result = await diagnoseQuizError({
      item: mcItem,
      concept: 'Elasticity',
      learnerConfidence: 5,
      lang: 'en',
      preferLocal: true,
    });
    expect(result.usedLlm).toBe(false);
    expect(result.data.kind).toBe('conceptual');
    expect(result.data.nextAction).toBe('feynman');
    expect(quizErrorKindLabel('recall', 'el')).toMatch(/ανάκλησης/i);
  });

  it('marks low-confidence short-answer as recall', async () => {
    const item: QuizSessionItem = {
      id: 'q2',
      quiz: {
        kind: 'short-answer',
        question: 'Define tariffs',
        acceptedAnswers: ['tax on imports'],
      },
    };
    const result = await diagnoseQuizError({
      item,
      concept: 'Tariffs',
      learnerConfidence: 1,
      lang: 'en',
      preferLocal: true,
    });
    expect(result.data.kind).toBe('recall');
    expect(result.data.nextAction).toBe('make-card');
  });
});

describe('pathFocus Try chips', () => {
  it('builds explain/quiz/cards for weak areas', () => {
    const chips = buildPathTryChips(pathFocusFromWeakArea('Tariffs'), 'en');
    expect(chips).toHaveLength(3);
    expect(chips[0]!.label).toMatch(/Explain/);
    expect(chips[1]!.tool).toBe('quiz');
    expect(chips[2]!.mode).toBe('memory-coach');
  });

  it('prioritizes Feynman after quiz miss', () => {
    const chips = buildPathTryChips(pathFocusFromQuizMiss('Elasticity'), 'el');
    expect(chips[0]!.mode).toBe('feynman');
    expect(chips[0]!.label).toMatch(/Feynman/);
  });
});

describe('smartFlashcard offline', () => {
  it('returns extractive card without LLM', async () => {
    const result = await buildSmartFlashcard({
      text: 'Elasticity measures responsiveness',
      concept: 'Elasticity',
      glossaryDefinition: 'Price sensitivity',
      lang: 'en',
      preferLocal: true,
    });
    expect(result.usedLlm).toBe(false);
    expect(result.data.source).toBe('extractive');
    expect(result.data.back).toBe('Price sensitivity');
  });
});

describe('scratchpadStepHint offline', () => {
  it('gives heuristic hint for equations', async () => {
    const result = await buildScratchpadStepHint({
      text: 'x = 2y + 3',
      lang: 'en',
      preferLocal: true,
    });
    expect(result.usedLlm).toBe(false);
    expect(result.data.hint.toLowerCase()).toMatch(/isolate|unknown|substitut/);
  });
});
