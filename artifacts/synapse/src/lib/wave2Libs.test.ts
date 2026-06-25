import { describe, it, expect } from 'vitest';
import { leitnerCardSourceLabel } from './leitnerCardSources';
import { buildQuizSessionSummaryCopy } from './quizSessionSummaryCopy';
import { buildCompareDifferencePrompt } from './compareExplainDifference';
import { buildFeynmanWeakDimensionPrompt } from './feynmanAgentPrompts';
import { findGlossaryTermMatch } from './readerGlossaryMatch';
import { downloadWhiteboardPng } from './whiteboardExport';

describe('leitnerCardSources', () => {
  it('labels quiz-mistake cards', () => {
    expect(leitnerCardSourceLabel('quiz-mistake', 'en')).toBe('Quiz mistake');
    expect(leitnerCardSourceLabel('quiz-mistake', 'el')).toContain('κουίζ');
  });
});

describe('quizSessionSummaryCopy', () => {
  it('suggests remediation on low accuracy', () => {
    const copy = buildQuizSessionSummaryCopy(45, 2.5, 'en');
    expect(copy.suggestion).toBeTruthy();
    expect(copy.detail).toContain('45%');
  });

  it('builds Greek copy', () => {
    const copy = buildQuizSessionSummaryCopy(85, 4.2, 'el');
    expect(copy.headline).toBeTruthy();
  });
});

describe('compareExplainDifference', () => {
  it('includes row text in prompt', () => {
    const p = buildCompareDifferencePrompt('Tariff · Quota', 'Trade', 'en');
    expect(p).toContain('Tariff');
  });
});

describe('feynmanAgentPrompts', () => {
  it('targets rubric dimension', () => {
    const p = buildFeynmanWeakDimensionPrompt('simplicity', 'Elasticity', 'My draft text', 'en');
    expect(p).toContain('simplicity');
    expect(p).toContain('Elasticity');
  });
});

describe('readerGlossaryMatch', () => {
  it('matches exact glossary terms', () => {
    const hit = findGlossaryTermMatch('Elasticity', [
      { term: 'Elasticity', definition: 'Price sensitivity', source: 'notes', relatedConcepts: [], courseId: 'c1' },
    ]);
    expect(hit?.definition).toBe('Price sensitivity');
  });
});

describe('whiteboardExport', () => {
  it('exports a function', () => {
    expect(typeof downloadWhiteboardPng).toBe('function');
  });
});
