/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Tasks } from './Tasks';
import { mockTasks, DEMO_INITIAL_MISTAKES } from '../demo/mockData';
import { createManualTask } from '../lib/personalTask';
import * as taskIcs from '../lib/taskIcs';
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

function openChrome(testId: string) {
  fireEvent.click(screen.getByTestId(testId));
}

describe('Tasks page', () => {
  it('renders page chrome and primary create-plan CTA', () => {
    renderTasks();
    expect(screen.getByTestId('tasks-page')).toBeTruthy();
    expect(screen.getByTestId('tasks-create-plan')).toBeTruthy();
    expect(screen.getByTestId('tasks-progress-chrome')).toBeTruthy();
    openChrome('tasks-progress-chrome');
    expect(screen.getByTestId('tasks-daily-goal')).toBeTruthy();
    expect(screen.queryByTestId('tasks-add-task')).toBeNull();
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
    expect(screen.getByTestId('tasks-alerts-chrome')).toBeTruthy();
    openChrome('tasks-alerts-chrome');
    expect(screen.getByTestId('tasks-danger-zone')).toBeTruthy();
  });

  it('renders study plan chips when provided', () => {
    const { onStartSession } = renderTasks({
      studyPlan: [{ label: 'Spaced reviews', minutes: 15, items: ['Review: Supply & Demand Equilibrium'] }],
    });
    openChrome('tasks-plan-chrome');
    const blocks = screen.getByTestId('tasks-study-plan-blocks');
    expect(blocks).toBeTruthy();
    fireEvent.click(within(blocks).getByRole('button', { name: /Spaced reviews/i }));
    expect(screen.getByTestId('tasks-panel-reviews')).toBeTruthy();
    expect(onStartSession).toHaveBeenCalledWith('review', ['task1']);
  });

  it('starts a retry session from the mistakes study-plan block', () => {
    const { onStartSession } = renderTasks({
      studyPlan: [{
        kind: 'mistakes',
        label: 'Retry mistakes',
        minutes: 12,
        items: ['Retry Mistakes: Elasticity Calculations'],
        taskIds: ['task4'],
      }],
    });
    openChrome('tasks-plan-chrome');
    fireEvent.click(screen.getByTestId('tasks-study-plan-mistakes'));
    expect(screen.getByTestId('tasks-panel-mistakes')).toBeTruthy();
    expect(onStartSession).toHaveBeenCalledWith('10min', ['task4']);
  });

  it('creates a personal task from the header action', () => {
    const onUpsertTask = vi.fn();
    renderTasks({
      onUpsertTask,
      courses: [{ id: 'c1', title: 'Microeconomics', color: '#818cf8', icon: '📊' }],
    });
    fireEvent.click(screen.getByTestId('tasks-add-task'));
    fireEvent.change(screen.getByTestId('task-form-title'), { target: { value: 'Office hours' } });
    fireEvent.click(screen.getByTestId('task-form-save'));
    expect(onUpsertTask).toHaveBeenCalled();
    const saved = onUpsertTask.mock.calls[0][0];
    expect(saved.title).toBe('Office hours');
    expect(saved.id.startsWith('manual-')).toBe(true);
  });

  it('blocks save when the title is empty', () => {
    const onUpsertTask = vi.fn();
    renderTasks({ onUpsertTask, courses: [{ id: 'c1', title: 'Microeconomics', color: '#818cf8', icon: '📊' }] });
    fireEvent.click(screen.getByTestId('tasks-add-task'));
    fireEvent.click(screen.getByTestId('task-form-save'));
    expect(onUpsertTask).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/title/i);
  });

  it('hides edit and delete on generated tasks', () => {
    renderTasks({
      onUpsertTask: vi.fn(),
      onDeleteTask: vi.fn(),
    });
    fireEvent.click(screen.getByText('Review: Supply & Demand Equilibrium'));
    expect(screen.queryByTestId('task-edit-task1')).toBeNull();
    expect(screen.queryByTestId('task-delete-task1')).toBeNull();
  });

  it('edits a personal task from the expanded row', () => {
    const onUpsertTask = vi.fn();
    const manual = createManualTask({
      title: 'Custom recap',
      course: { id: 'c1', title: 'Microeconomics', color: '#818cf8', icon: '📊' },
      category: 'learn',
      priority: 'medium',
      estimatedMinutes: 10,
    });
    renderTasks({
      tasks: [manual],
      onUpsertTask,
      courses: [{ id: 'c1', title: 'Microeconomics', color: '#818cf8', icon: '📊' }],
    });
    fireEvent.click(screen.getByText('Custom recap'));
    fireEvent.click(screen.getByTestId(`task-edit-${manual.id}`));
    fireEvent.change(screen.getByTestId('task-form-title'), { target: { value: 'Revised recap' } });
    fireEvent.click(screen.getByTestId('task-form-save'));
    expect(onUpsertTask).toHaveBeenCalled();
    const saved = onUpsertTask.mock.calls[0][0];
    expect(saved.id).toBe(manual.id);
    expect(saved.title).toBe('Revised recap');
  });

  it('deletes a personal task after confirm', () => {
    const onDeleteTask = vi.fn();
    const manual = createManualTask({
      title: 'Custom recap',
      course: { id: 'c1', title: 'Microeconomics', color: '#818cf8', icon: '📊' },
      category: 'learn',
      priority: 'medium',
      estimatedMinutes: 10,
    });
    renderTasks({
      tasks: [manual],
      onDeleteTask,
      onUpsertTask: vi.fn(),
      courses: [{ id: 'c1', title: 'Microeconomics', color: '#818cf8', icon: '📊' }],
    });
    fireEvent.click(screen.getByText('Custom recap'));
    fireEvent.click(screen.getByTestId(`task-delete-${manual.id}`));
    fireEvent.click(screen.getByTestId('task-delete-confirm-confirm'));
    expect(onDeleteTask).toHaveBeenCalledWith(manual.id);
  });

  it('exports an ICS file from an expanded task', () => {
    const spy = vi.spyOn(taskIcs, 'downloadTaskIcs').mockImplementation(() => {});
    renderTasks();
    fireEvent.click(screen.getByText('Review: Supply & Demand Equilibrium'));
    fireEvent.click(screen.getByTestId('task-export-ics-task1'));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'task1' }));
    spy.mockRestore();
  });
});
