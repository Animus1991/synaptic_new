/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Tasks } from './Tasks';
import { mockTasks, DEMO_INITIAL_MISTAKES } from '../demo/mockData';
import type { SkillNode } from '../types';

afterEach(() => cleanup());

const weakAreas: SkillNode[] = [
  {
    concept: 'Elasticity',
    courseId: 'c1',
    mastery: 28,
    lastPracticed: '2026-01-10',
    retentionPrediction: 0.5,
    practiceCount: 4,
    averageResponseTime: 12,
    errorRate: 0.4,
  },
];

function renderTasks(overrides: Partial<Parameters<typeof Tasks>[0]> = {}) {
  const onStartSession = vi.fn();
  const onStartTask = vi.fn();
  const onComplete = vi.fn();
  const onResolveMistake = vi.fn();
  const onFocusWeakArea = vi.fn();
  const onOpenAgent = vi.fn();

  render(
    <Tasks
      tasks={mockTasks.slice(0, 6)}
      lang="en"
      onComplete={onComplete}
      onStartTask={onStartTask}
      onStartSession={onStartSession}
      daysToExam={0}
      openMistakes={DEMO_INITIAL_MISTAKES}
      onResolveMistake={onResolveMistake}
      weakAreas={weakAreas}
      onFocusWeakArea={onFocusWeakArea}
      onOpenAgent={onOpenAgent}
      {...overrides}
    />,
  );

  return { onStartSession, onStartTask, onComplete, onResolveMistake, onFocusWeakArea, onOpenAgent };
}

describe('Tasks page', () => {
  it('renders page chrome and primary create-plan CTA', () => {
    renderTasks();
    expect(screen.getByTestId('tasks-page')).toBeTruthy();
    expect(screen.getByTestId('tasks-create-plan')).toBeTruthy();
    expect(screen.getByTestId('tasks-daily-goal')).toBeTruthy();
  });

  it('disables create-plan when no tasks match any session queue', () => {
    renderTasks({ tasks: [] });
    expect((screen.getByTestId('tasks-create-plan') as HTMLButtonElement).disabled).toBe(true);
  });

  it('create-plan starts recommended session when tasks exist', () => {
    const { onStartSession } = renderTasks({ daysToExam: 0 });
    fireEvent.click(screen.getByTestId('tasks-create-plan'));
    expect(onStartSession).toHaveBeenCalled();
    expect(onStartSession.mock.calls[0][0]).toBe('cram');
  });

  it('switches tabs via sticky tab bar', () => {
    renderTasks();
    fireEvent.click(screen.getByTestId('tasks-tab-mistakes'));
    expect(screen.getByTestId('tasks-panel-mistakes')).toBeTruthy();
    expect(screen.getByText(/Elasticity Calculations/i)).toBeTruthy();
  });

  it('mistakes tab: similar practice focuses concept; mark resolved dismisses', () => {
    const { onFocusWeakArea, onResolveMistake } = renderTasks();
    fireEvent.click(screen.getByTestId('tasks-tab-mistakes'));
    const panel = screen.getByTestId('tasks-panel-mistakes');
    fireEvent.click(within(panel).getAllByRole('button', { name: /Similar practice/i })[0]!);
    expect(onFocusWeakArea).toHaveBeenCalledWith('Elasticity Calculations');
    fireEvent.click(within(panel).getAllByRole('button', { name: /Mark resolved/i })[0]!);
    expect(onResolveMistake).toHaveBeenCalledWith('mistake-1');
  });

  it('shows danger zone when exam is within 14 days', () => {
    renderTasks({ daysToExam: 0 });
    expect(screen.getByTestId('tasks-danger-zone')).toBeTruthy();
  });

  it('renders study plan chips when provided', () => {
    renderTasks({
      studyPlan: [{ label: 'Spaced reviews', minutes: 15, items: ['a'] }],
    });
    const blocks = screen.getByTestId('tasks-study-plan-blocks');
    expect(blocks).toBeTruthy();
    fireEvent.click(within(blocks).getByRole('button', { name: /Spaced reviews/i }));
    expect(screen.getByTestId('tasks-panel-reviews')).toBeTruthy();
  });
});
