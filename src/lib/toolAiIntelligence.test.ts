import { describe, expect, it } from 'vitest';
import { resolveToolAiRoute, toolAiCanUseLlm } from './toolAiAction';
import { diagnoseQuizError, quizErrorKindLabel } from './quizErrorDiagnosis';
import { buildPathTryChips, pathFocusFromQuizMiss, pathFocusFromWeakArea } from './pathFocus';
import { buildSmartFlashcard } from './smartFlashcard';
import { buildScratchpadStepHint } from './scratchpadStepHint';
import { buildInsightsAskPrompt } from './analyticsAskPrompt';
import { buildLibraryAskPrompt } from './libraryAskPrompt';
import {
  buildCohortWeakConceptsDraft,
  flattenTopicMasteryHeatmap,
} from './teacherWeakConceptsDraft';
import {
  inferModelTier,
  resolveBaseUrlPreset,
  resolveModelTierPreset,
} from './aiEconomicsPresets';
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

describe('OPT-AI-C library / analytics / teacher prompts', () => {
  it('builds library ask prompt with course', () => {
    const en = buildLibraryAskPrompt({ fileName: 'notes.pdf', courseTitle: 'Macro' }, 'en');
    expect(en).toMatch(/notes\.pdf/);
    expect(en).toMatch(/Macro/);
    const el = buildLibraryAskPrompt({ fileName: 'σημειώσεις.pdf' }, 'el');
    expect(el).toMatch(/σημειώσεις/);
  });

  it('builds insights ask prompt from weak actions', () => {
    const prompt = buildInsightsAskPrompt({
      observations: ['Mastery dipped this week'],
      actions: [{ concept: 'Tariffs' }, { concept: 'Elasticity' }],
    }, 'en');
    expect(prompt).toMatch(/Tariffs/);
    expect(prompt).toMatch(/study next/i);
  });

  it('drafts cohort weak announcement from heatmap', () => {
    const topics = flattenTopicMasteryHeatmap([
      {
        classId: 'c1',
        topics: [
          { topicId: 't1', topicLabel: 'Tariffs', avgScore: 40, masteryLevel: 0.4 },
          { topicId: 't2', topicLabel: 'GDP', avgScore: 90, masteryLevel: 0.9 },
        ],
      },
    ]);
    const draft = buildCohortWeakConceptsDraft(topics, 'c1', 'en');
    expect(draft?.weakCount).toBe(1);
    expect(draft?.body).toMatch(/Tariffs/);
    expect(draft?.body).not.toMatch(/GDP/);
  });
});

describe('OPT-AI-D economics presets', () => {
  it('resolves model and base URL presets', () => {
    expect(resolveModelTierPreset('quality').model).toBe('gpt-4o');
    expect(resolveBaseUrlPreset('ollama').baseUrl).toMatch(/11434/);
    expect(inferModelTier('gpt-4o-mini')).toBe('economy');
    expect(inferModelTier('gpt-4o')).toBe('quality');
  });
});
