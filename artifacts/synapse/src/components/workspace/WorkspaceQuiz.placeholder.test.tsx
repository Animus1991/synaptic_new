/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WorkspaceQuiz } from './WorkspaceQuiz';
import type { QuizDef } from '../../lib/lessonTypes';
import { workspaceToolEmptyMessage } from '../../lib/workspaceEmptyState';

afterEach(() => cleanup());

describe('WorkspaceQuiz placeholder empty state', () => {
  it('renders an actionable empty state (no fake "- - -" options) when placeholder', () => {
    const quizDef: QuizDef = {
      kind: 'mc',
      question: workspaceToolEmptyMessage({ tool: 'quiz', hasSource: false, lang: 'en', concept: 'Intro' }),
      options: ['- - -', '- - -', '- - -', '- - -'],
      correctIndex: 0,
      placeholder: true,
    };
    render(<WorkspaceQuiz quizDef={quizDef} lang="en" onComplete={vi.fn()} />);

    expect(screen.getByTestId('workspace-quiz-empty')).toBeTruthy();
    // The interactive quiz surface and fake option buttons must NOT render.
    expect(screen.queryByTestId('workspace-quiz')).toBeNull();
    expect(screen.queryByText('- - -')).toBeNull();
  });

  it('renders interactive options for a real MC quiz', () => {
    const quizDef: QuizDef = {
      kind: 'mc',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5'],
      correctIndex: 1,
    };
    render(<WorkspaceQuiz quizDef={quizDef} lang="en" onComplete={vi.fn()} />);

    expect(screen.getByTestId('workspace-quiz')).toBeTruthy();
    expect(screen.queryByTestId('workspace-quiz-empty')).toBeNull();
    expect(screen.getByText('4')).toBeTruthy();
  });
});
