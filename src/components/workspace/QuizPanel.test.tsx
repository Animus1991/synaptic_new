/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QuizPanel } from './QuizPanel';
import type { QuizSessionContent } from '../../lib/quizSessionModel';

afterEach(() => cleanup());

const mcQuiz = {
  id: 'q1',
  quiz: {
    kind: 'mc' as const,
    question: 'What is price elasticity of demand?',
    options: ['Responsive', 'Fixed', 'Random'],
    correctIndex: 0,
  },
};

const session: QuizSessionContent = {
  items: [mcQuiz],
  sectionLabel: 'Markets',
  weakExtraction: false,
  passageGrounded: false,
  hasSource: true,
};

const quizPanelDefaults = {
  desiredCount: 5,
  onChangeDesiredCount: vi.fn(),
  countOptions: [3, 5, 10] as const,
};

describe('QuizPanel έΑΦ selection contract ┬π13.5 (Wave 5D)', () => {
  it('shows selection bar when question is clicked', () => {
    const onSelectionAction = vi.fn();
    render(
      <QuizPanel
        session={session}
        concept="Elasticity"
        lang="en"
        scopeKey="test-scope"
        onSessionComplete={vi.fn()}
        onSelectionAction={onSelectionAction}
        {...quizPanelDefaults}
      />,
    );
    fireEvent.click(screen.getByTestId('quiz-question-select'));
    expect(screen.getByTestId('quiz-selection-actions')).toBeTruthy();
    fireEvent.click(screen.getByTestId('selection-action-ask-agent'));
    expect(onSelectionAction).toHaveBeenCalledWith('ask-agent', expect.objectContaining({
      text: 'What is price elasticity of demand?',
      term: 'Elasticity',
      originTool: 'quiz',
      sectionLabel: 'Markets',
    }));
  });

  it('does not show quiz action in bar (hidden on quiz origin)', () => {
    render(
      <QuizPanel
        session={session}
        concept="Elasticity"
        lang="en"
        scopeKey="test-scope"
        onSessionComplete={vi.fn()}
        onSelectionAction={vi.fn()}
        {...quizPanelDefaults}
      />,
    );
    fireEvent.click(screen.getByTestId('quiz-question-select'));
    expect(screen.queryByTestId('selection-action-quiz')).toBeNull();
    expect(screen.getByTestId('selection-action-open-reader')).toBeTruthy();
  });

  it('shows ┬π13.5 selection contract strip (Wave 6.8c)', () => {
    render(
      <QuizPanel
        session={session}
        concept="Elasticity"
        lang="en"
        scopeKey="test-scope"
        onSessionComplete={vi.fn()}
        onSelectionAction={vi.fn()}
        {...quizPanelDefaults}
      />,
    );
    expect(screen.getByTestId('quiz-selection-contract-strip')).toBeTruthy();
    expect(screen.getByTestId('quiz-selection-contract-strip').textContent).toMatch(/Text selection/i);
  });
});
