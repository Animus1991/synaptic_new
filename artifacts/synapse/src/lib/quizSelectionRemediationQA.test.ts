import { describe, expect, it } from 'vitest';
import type { QuizSessionItem, QuizSessionState } from './quizSession';
import {
  auditQuizSelectionRemediation,
  buildQuizSelectionContext,
  buildQuizWrongItemSummaries,
  listQuizWrongItems,
  quizWrongAnswerHint,
} from './quizSelectionRemediationQA';
import { initQuizSession, recordSessionAnswer } from './quizSession';

const mcItem: QuizSessionItem = {
  id: 'q1',
  quiz: {
    kind: 'mc',
    question: 'What is elasticity?',
    options: ['Price sensitivity', 'Supply curve', 'Demand shift'],
    correctIndex: 0,
  },
};

const mcItem2: QuizSessionItem = {
  id: 'q2',
  quiz: {
    kind: 'mc',
    question: 'What shifts demand?',
    options: ['Income', 'Elasticity', 'Equilibrium'],
    correctIndex: 0,
  },
};

function completedSession(wrongIndices: number[]): QuizSessionState {
  let state = initQuizSession('scope', 'Elasticity', [mcItem, mcItem2]);
  for (let i = 0; i < 2; i++) {
    state = recordSessionAnswer(state, !wrongIndices.includes(i), 3);
  }
  return state;
}

describe('quizSelectionRemediationQA', () => {
  it('audits §13.5 selection contract for quiz origin', () => {
    const report = auditQuizSelectionRemediation({
      lang: 'en',
      concept: 'Elasticity',
      sectionLabel: 'Markets',
    });

    expect(report.ok).toBe(true);
    expect(report.hiddenQuizAction).toBe(true);
    expect(report.openReaderAvailable).toBe(true);
    expect(report.selectionActionCount).toBe(7);
  });

  it('builds selection context from wrong item', () => {
    const ctx = buildQuizSelectionContext(mcItem, 'Elasticity', 'Markets');
    expect(ctx.originTool).toBe('quiz');
    expect(ctx.text).toBe('What is elasticity?');
    expect(ctx.sectionLabel).toBe('Markets');
  });

  it('lists wrong items from completed session', () => {
    const state = completedSession([0]);
    expect(listQuizWrongItems(state)).toHaveLength(1);
    expect(listQuizWrongItems(state)[0]?.id).toBe('q1');
  });

  it('builds remediation summaries with all paths', () => {
    const state = completedSession([0, 1]);
    const summaries = buildQuizWrongItemSummaries(state, 'Markets');
    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.remediationKinds).toContain('open-reader');
    expect(summaries[0]?.correctAnswer).toBe('Price sensitivity');
  });

  it('formats wrong-answer hint bilingually', () => {
    expect(quizWrongAnswerHint(mcItem, 'Elasticity', 'en')).toContain('Price sensitivity');
    expect(quizWrongAnswerHint(mcItem, 'Elasticity', 'el')).toContain('σωστή');
  });

  it('reports wrong item count in audit when session has mistakes', () => {
    const state = completedSession([1]);
    const report = auditQuizSelectionRemediation({
      lang: 'en',
      session: state,
      concept: 'Elasticity',
    });
    expect(report.wrongItemCount).toBe(1);
    expect(report.ok).toBe(true);
  });
});
